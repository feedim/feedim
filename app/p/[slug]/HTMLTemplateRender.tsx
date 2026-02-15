"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { escapeHtml, sanitizeUrl } from "@/lib/security/sanitize";
import DOMPurify from 'isomorphic-dompurify';
import MusicPlayer from "@/components/MusicPlayer";
import ShareIconButton from "@/components/ShareIconButton";

// SSR-safe: remove an element (and its children) matching a specific attribute from HTML string
function removeElementByAttr(html: string, attr: string, value: string): string {
  const needle = `${attr}="${value}"`;
  const idx = html.indexOf(needle);
  if (idx === -1) return html;

  // Walk back to find the '<' of the opening tag
  let tagStart = html.lastIndexOf('<', idx);
  if (tagStart === -1) return html;

  let tagEnd = html.indexOf('>', tagStart);
  if (tagEnd === -1) return html;

  const openTag = html.substring(tagStart, tagEnd + 1);

  // Self-closing tag — just remove it
  if (openTag.endsWith('/>')) {
    return html.substring(0, tagStart) + html.substring(tagEnd + 1);
  }

  const tagNameMatch = openTag.match(/^<(\w+)/);
  if (!tagNameMatch) return html;
  const tagName = tagNameMatch[1].toLowerCase();

  // Count depth to find the matching closing tag
  let depth = 1;
  let pos = tagEnd + 1;
  const openRe = new RegExp(`<${tagName}(?=[\\s>/])`, 'gi');
  const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');

  while (depth > 0 && pos < html.length) {
    openRe.lastIndex = pos;
    closeRe.lastIndex = pos;
    const nextOpen = openRe.exec(html);
    const nextClose = closeRe.exec(html);

    if (!nextClose) break;

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++;
      pos = nextOpen.index + nextOpen[0].length;
    } else {
      depth--;
      if (depth === 0) {
        return html.substring(0, tagStart) + html.substring(nextClose.index + nextClose[0].length);
      }
      pos = nextClose.index + nextClose[0].length;
    }
  }
  return html;
}

// Extract <script> contents from HTML before DOMPurify strips them
function extractScripts(html: string): { cleanHtml: string; scripts: string[] } {
  const scripts: string[] = [];
  const cleanHtml = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
    // Skip application/json scripts (palette data etc.) — don't execute them
    if (/type\s*=\s*["']application\/json["']/i.test(attrs)) return '';
    const trimmed = content.trim();
    if (trimmed) scripts.push(trimmed);
    return '';
  });
  return { cleanHtml, scripts };
}

export function HTMLTemplateRender({ project, musicUrl }: { project: any; musicUrl?: string }) {
  const template = project.templates;
  const htmlData = project.hook_values || {};
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmbed, setIsEmbed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsEmbed(params.get('embed') === '1');
    // Reset layout background so template CSS takes effect
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  // Anti-theft: block devtools shortcuts, right-click, selection on public pages
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'S') { e.preventDefault(); return; }
    };
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Add error handling for template scripts
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress null textContent errors from template scripts
      if (event.message.includes("textContent") || event.message.includes("Cannot set properties of null")) {
        event.preventDefault();
        if (process.env.NODE_ENV === 'development') {
          console.warn("Template script error suppressed:", event.message);
        }
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("error", handleError);
    };
  }, []);

  if (!template?.html_content?.trim()) {
    return <div>Şablon bulunamadı</div>;
  }

  let html = template.html_content;

  const r2Domains = ['pub-104d06222a3641f0853ce1540130365b.r2.dev', 'pub-180c00d0fd394407a8fe289a038f2de2.r2.dev'];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const toProxyUrl = (val: string) => {
    for (const d of r2Domains) {
      if (val.includes(d)) return val.replace(`https://${d}/`, `${origin}/api/r2/`);
    }
    return val;
  };

  // Simple string replacement for rendering with XSS protection
  Object.entries(htmlData).forEach(([key, value]) => {
    const stringValue = toProxyUrl(String(value));

    // Match data-editable elements and replace their content/attributes
    const regex = new RegExp(`(<[^>]*data-editable="${key}"[^>]*>)(.*?)(<\\/[^>]+>)`, 'gs');
    html = html.replace(regex, (match: string, openTag: string, content: string, closeTag: string) => {
      // List: skip in regex pass, handled by DOMParser below
      if (openTag.includes('data-type="list"')) {
        return match;
      }
      // Image: update src attribute
      if (openTag.includes('data-type="image"')) {
        const sanitizedUrl = sanitizeUrl(stringValue);
        return openTag.replace(/src="[^"]*"/, `src="${sanitizedUrl}"`) + content + closeTag;
      }
      // URL: update href attribute
      if (openTag.includes('data-type="url"')) {
        const sanitizedUrl = sanitizeUrl(stringValue);
        return openTag.replace(/href="[^"]*"/, `href="${sanitizedUrl}"`) + content + closeTag;
      }
      // Tel: update href with tel: protocol
      if (openTag.includes('data-type="tel"')) {
        const safePhone = escapeHtml(stringValue);
        return openTag.replace(/href="[^"]*"/, `href="tel:${safePhone}"`) + content + closeTag;
      }
      // Email: update href with mailto: protocol
      if (openTag.includes('data-type="email"')) {
        const safeEmail = escapeHtml(stringValue);
        return openTag.replace(/href="[^"]*"/, `href="mailto:${safeEmail}"`) + content + closeTag;
      }
      // WhatsApp: update href with wa.me link
      if (openTag.includes('data-type="whatsapp"')) {
        const digits = stringValue.replace(/\D/g, '');
        return openTag.replace(/href="[^"]*"/, `href="https://wa.me/${escapeHtml(digits)}"`) + content + closeTag;
      }
      // Background-image: update style attribute, keep original content
      if (openTag.includes('data-type="background-image"')) {
        const sanitizedUrl = sanitizeUrl(stringValue);
        const updatedTag = openTag.replace(
          /style="([^"]*)"/,
          (_, existingStyle: string) => `style="${existingStyle}; background-image: url('${sanitizedUrl}');"`
        );
        return updatedTag + content + closeTag;
      }
      // Color: update inline style with color value
      if (openTag.includes('data-type="color"')) {
        const safeColor = escapeHtml(stringValue);
        const cssPropMatch = openTag.match(/data-css-property="([^"]*)"/);
        const cssProp = cssPropMatch ? cssPropMatch[1] : 'background-color';
        if (openTag.includes('style="')) {
          const updatedTag = openTag.replace(
            /style="([^"]*)"/,
            (_, existingStyle: string) => `style="${existingStyle}; ${cssProp}: ${safeColor};"`
          );
          return updatedTag + content + closeTag;
        } else {
          const updatedTag = openTag.replace(/>/, ` style="${cssProp}: ${safeColor};">`);
          return updatedTag + content + closeTag;
        }
      }
      // For text content - escape HTML to prevent XSS
      const sanitizedText = escapeHtml(stringValue);
      // Check for text color override (__color_ prefix)
      const colorKey = `__color_${key}`;
      const colorValue = htmlData[colorKey];
      if (colorValue) {
        const safeColor = escapeHtml(String(colorValue));
        if (openTag.includes('style="')) {
          const coloredTag = openTag.replace(/style="([^"]*)"/, (_, s: string) => `style="${s}; color: ${safeColor};"`);
          return coloredTag + sanitizedText + closeTag;
        } else {
          const coloredTag = openTag.replace(/>$/, ` style="color: ${safeColor};">`);
          return coloredTag + sanitizedText + closeTag;
        }
      }
      return openTag + sanitizedText + closeTag;
    });

    // Handle src attributes for images
    const imgSrcRegex = new RegExp(`(<img[^>]*data-editable="${key}"[^>]*src=")[^"]*"`, 'g');
    const sanitizedUrl = sanitizeUrl(stringValue);
    html = html.replace(imgSrcRegex, `$1${sanitizedUrl}"`);
  });

  // Process list types (SSR-safe — regex instead of DOMParser)
  const listKeys = Object.entries(htmlData).filter(([key]) => {
    return html.includes(`data-editable="${key}"`) && html.includes('data-type="list"');
  });

  if (listKeys.length > 0) {
    listKeys.forEach(([key, value]) => {
      // Match opening tag that has both data-editable="key" AND data-type="list"
      const listRegex = new RegExp(
        `(<[^>]*data-editable="${key}"[^>]*data-type="list"[^>]*>)` +
        `|(<[^>]*data-type="list"[^>]*data-editable="${key}"[^>]*>)`,
        'g'
      );
      const m = listRegex.exec(html);
      if (!m) return;

      const openTag = m[1] || m[2];
      const openStart = m.index;
      const openEnd = openStart + openTag.length;

      try {
        const items = JSON.parse(String(value));
        if (!Array.isArray(items)) return;

        const attr = (name: string) => {
          const r = openTag.match(new RegExp(`${name}="([^"]*)"`));
          return r ? r[1] : '';
        };

        const itemClass = attr('data-list-item-class');
        const sepClass = attr('data-list-sep-class');
        const sepHtml = attr('data-list-sep-html');
        const duplicate = attr('data-list-duplicate') === 'true';

        const buildItems = (arr: string[]) => arr.map(text => {
          let s = `<span class="${escapeHtml(itemClass)}">${escapeHtml(text)}</span>`;
          if (sepClass) s += `<span class="${escapeHtml(sepClass)}">${sepHtml}</span>`;
          return s;
        }).join('');

        let inner = buildItems(items);
        if (duplicate) inner += buildItems(items);

        // Find the tag name from open tag
        const tagNameMatch = openTag.match(/^<(\w+)/);
        if (!tagNameMatch) return;
        const tagName = tagNameMatch[1].toLowerCase();

        // Find matching closing tag
        let depth = 1;
        let pos = openEnd;
        const openRe = new RegExp(`<${tagName}(?=[\\s>/])`, 'gi');
        const closeRe = new RegExp(`</${tagName}\\s*>`, 'gi');

        while (depth > 0 && pos < html.length) {
          openRe.lastIndex = pos;
          closeRe.lastIndex = pos;
          const nextOpen = openRe.exec(html);
          const nextClose = closeRe.exec(html);
          if (!nextClose) break;
          if (nextOpen && nextOpen.index < nextClose.index) {
            depth++;
            pos = nextOpen.index + nextOpen[0].length;
          } else {
            depth--;
            if (depth === 0) {
              html = html.substring(0, openEnd) + inner + html.substring(nextClose.index);
              break;
            }
            pos = nextClose.index + nextClose[0].length;
          }
        }
      } catch {}
    });
  }

  // Remove hidden data-area sections (SSR-safe — no DOMParser)
  const hiddenAreas = Object.entries(htmlData)
    .filter(([key, value]) => key.startsWith('__area_') && value === 'hidden')
    .map(([key]) => key.replace('__area_', ''));

  hiddenAreas.forEach(areaName => {
    html = removeElementByAttr(html, 'data-area', areaName);
  });

  // Apply palette override CSS on public page
  const paletteMatch = html.match(/<script[^>]*data-palettes[^>]*>([\s\S]*?)<\/script>/i);
  if (paletteMatch) {
    try {
      const pd = JSON.parse(paletteMatch[1]);
      if (pd?.palettes?.length) {
        const selectedId = (htmlData.__palette as string) || pd.default;
        const mode = ((htmlData.__theme_mode as string) || 'light') as 'light' | 'dark';
        const pal = pd.palettes.find((p: any) => p.id === selectedId);
        if (pal) {
          const colors = pal[mode];
          if (selectedId === pd.default && mode === 'light') {
            // Default palette + light mode: only body-bg override (CSS vars already match :root)
            const bgCss = `<style data-palette-override>body{background:${colors['body-bg']}!important}</style>`;
            html = html.replace('</head>', bgCss + '</head>');
          } else {
            const overrideCss = `<style data-palette-override>:root{--text:${colors.text};--muted:${colors.muted};--light:${colors.light};--border:${colors.border};--accent:${colors.accent};--accent-light:${colors['accent-light']}}body{background:${colors['body-bg']}!important}</style>`;
            html = html.replace('</head>', overrideCss + '</head>');
          }
        }
      }
    } catch {}
  }

  // Extract scripts before DOMPurify strips them
  const { cleanHtml, scripts: templateScripts } = extractScripts(html);

  // Sanitize HTML and strip template metadata to hinder HTML theft
  let sanitizedHtml = DOMPurify.sanitize(cleanHtml, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['iframe', 'video', 'audio', 'source', 'style', 'link'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'media', 'rel', 'crossorigin', 'href', 'as'],
    ALLOW_DATA_ATTR: false,
  });
  sanitizedHtml = sanitizedHtml.replace(/\s*data-(?:editable|type|hook|locked|label|clickable|area|area-label|css-property|list-[a-z-]+|duplicate)="[^"]*"/g, '');

  // SEO: nofollow for external links, dofollow for forilove (SSR-safe — regex)
  sanitizedHtml = sanitizedHtml.replace(/<a\s([^>]*?)>/gi, (match, attrs: string) => {
    const hrefMatch = attrs.match(/href="([^"]*)"/);
    if (!hrefMatch) return match;
    const href = hrefMatch[1];
    if (!href || href.startsWith('#') || href.startsWith('/') || href.startsWith('tel:') || href.startsWith('mailto:')) return match;
    try {
      const url = new URL(href, 'https://forilove.com');
      const isInternal = url.hostname === 'forilove.com' || url.hostname.endsWith('.forilove.com');
      const rel = isInternal ? 'noopener noreferrer' : 'nofollow noopener noreferrer';
      const cleanAttrs = attrs.replace(/\s*rel="[^"]*"/g, '');
      return `<a ${cleanAttrs} rel="${rel}">`;
    } catch {
      const cleanAttrs = attrs.replace(/\s*rel="[^"]*"/g, '');
      return `<a ${cleanAttrs} rel="nofollow noopener noreferrer">`;
    }
  });

  // Inject font <link> tags into document <head> for reliable cross-platform loading
  useEffect(() => {
    const fontLinkRegex = /<link[^>]*href="[^"]*fonts\.googleapis\.com[^"]*"[^>]*>/gi;
    const preconnectRegex = /<link[^>]*rel="preconnect"[^>]*href="[^"]*fonts\.[^"]*"[^>]*>/gi;
    const allLinks = [...(sanitizedHtml.match(fontLinkRegex) || []), ...(sanitizedHtml.match(preconnectRegex) || [])];
    const injected: HTMLLinkElement[] = [];
    allLinks.forEach(linkTag => {
      const hrefMatch = linkTag.match(/href="([^"]*)"/);
      if (!hrefMatch) return;
      const href = hrefMatch[1];
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      if (linkTag.includes('rel="preconnect"')) {
        link.rel = 'preconnect';
        if (linkTag.includes('crossorigin')) link.crossOrigin = 'anonymous';
      } else {
        link.rel = 'stylesheet';
      }
      link.href = href;
      document.head.appendChild(link);
      injected.push(link);
    });
    return () => { injected.forEach(l => l.remove()); };
  }, [sanitizedHtml]);

  // Run extracted template scripts after DOM render — wait for paint then execute
  useEffect(() => {
    if (!templateScripts.length) return;
    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        templateScripts.forEach((code) => {
          try { new Function(code)(); } catch (e) {
            if (process.env.NODE_ENV === 'development') console.warn('Template script error:', e);
          }
        });
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(rafId); };
  }, [sanitizedHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        className="html-template-render"
        suppressHydrationWarning
      />

      {/* Forilove Bottom Branding */}
      <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center no-underline" style={{ height: 34, background: 'lab(49.5493% 79.8381 2.31768)', gap: 8, textDecoration: 'none' }}>
        <div className="flex items-center" style={{ gap: 4 }}>
          <Heart className="fill-white text-white" style={{ width: 11, height: 11 }} />
          <span className="text-white" style={{ fontSize: 12, fontWeight: 600 }}>Forilove ile yapıldı</span>
        </div>
        <span style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.3)' }} />
        <span className="text-white" style={{ fontSize: 11, fontWeight: 500, opacity: 0.9 }}>Hemen Dene &rarr;</span>
      </a>
      {/* Spacer for music player */}
      {musicUrl && <div style={{ height: 72, background: 'lab(49.5493% 79.8381 2.31768)' }} />}

      {/* Share Button — hidden in embed/inspect mode */}
      {!isEmbed && (
        <ShareIconButton
          url={`${typeof window !== "undefined" ? window.location.href : ""}`}
          title={project.title}
          variant="fixed"
          size={18}
        />
      )}

      {/* Music Player */}
      {musicUrl && <MusicPlayer musicUrl={musicUrl} />}
    </>
  );
}
