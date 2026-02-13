"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { escapeHtml, sanitizeUrl } from "@/lib/security/sanitize";
import DOMPurify from 'isomorphic-dompurify';
import MusicPlayer from "@/components/MusicPlayer";
import ShareIconButton from "@/components/ShareIconButton";

// Extract <script> contents from HTML before DOMPurify strips them
function extractScripts(html: string): { cleanHtml: string; scripts: string[] } {
  const scripts: string[] = [];
  const cleanHtml = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, content) => {
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

    // Published page touch optimizations
    const s = document.documentElement.style;
    const b = document.body.style;
    s.overscrollBehavior = 'none';
    b.overscrollBehavior = 'none';
    s.setProperty('touch-action', 'manipulation');
    b.setProperty('touch-action', 'manipulation');
    b.setProperty('-webkit-user-select', 'none');
    b.setProperty('user-select', 'none');

    return () => {
      window.removeEventListener("error", handleError);
      s.overscrollBehavior = '';
      b.overscrollBehavior = '';
      s.removeProperty('touch-action');
      b.removeProperty('touch-action');
      b.removeProperty('-webkit-user-select');
      b.removeProperty('user-select');
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
      return openTag + sanitizedText + closeTag;
    });

    // Handle src attributes for images
    const imgSrcRegex = new RegExp(`(<img[^>]*data-editable="${key}"[^>]*src=")[^"]*"`, 'g');
    const sanitizedUrl = sanitizeUrl(stringValue);
    html = html.replace(imgSrcRegex, `$1${sanitizedUrl}"`);
  });

  // Process list types via DOMParser
  const listKeys = Object.entries(htmlData).filter(([key]) => {
    return html.includes(`data-editable="${key}"`) && html.includes('data-type="list"');
  });

  if (listKeys.length > 0) {
    const listParser = new DOMParser();
    const listDoc = listParser.parseFromString(html, 'text/html');

    listKeys.forEach(([key, value]) => {
      const el = listDoc.querySelector(`[data-editable="${key}"]`);
      if (!el || el.getAttribute('data-type') !== 'list') return;

      try {
        const items = JSON.parse(String(value));
        if (!Array.isArray(items)) return;

        const itemClass = el.getAttribute('data-list-item-class') || '';
        const sepClass = el.getAttribute('data-list-sep-class') || '';
        const sepHtml = el.getAttribute('data-list-sep-html') || '';
        const duplicate = el.getAttribute('data-list-duplicate') === 'true';

        const buildItems = (arr: string[]) => arr.map(text => {
          let s = `<span class="${escapeHtml(itemClass)}">${escapeHtml(text)}</span>`;
          if (sepClass) s += `<span class="${escapeHtml(sepClass)}">${sepHtml}</span>`;
          return s;
        }).join('');

        let inner = buildItems(items);
        if (duplicate) inner += buildItems(items);
        el.innerHTML = inner;
      } catch {}
    });

    html = listDoc.documentElement.outerHTML;
  }

  // Remove hidden data-area sections
  const hiddenAreas = Object.entries(htmlData)
    .filter(([key, value]) => key.startsWith('__area_') && value === 'hidden')
    .map(([key]) => key.replace('__area_', ''));

  if (hiddenAreas.length > 0) {
    const areaParser = new DOMParser();
    const areaDoc = areaParser.parseFromString(html, 'text/html');
    hiddenAreas.forEach(areaName => {
      const el = areaDoc.querySelector(`[data-area="${areaName}"]`);
      if (el) el.remove();
    });
    html = areaDoc.documentElement.outerHTML;
  }

  // Extract scripts before DOMPurify strips them
  const { cleanHtml, scripts: templateScripts } = extractScripts(html);

  // Sanitize HTML with DOMPurify before rendering
  const sanitizedHtml = DOMPurify.sanitize(cleanHtml, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['iframe', 'video', 'audio', 'source', 'style', 'link'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'data-editable', 'data-type', 'data-label', 'media', 'data-list-item-class', 'data-list-sep-class', 'data-list-sep-html', 'data-list-duplicate'],
    ALLOW_DATA_ATTR: true,
  });

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
