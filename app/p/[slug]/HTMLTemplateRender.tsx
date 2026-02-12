"use client";

import { useEffect, useRef } from "react";
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

    // Disable overscroll bounce on published pages
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      window.removeEventListener("error", handleError);
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
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
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'data-editable', 'data-type', 'data-label', 'media'],
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

      {/* Share Button */}
      <ShareIconButton
        url={`${typeof window !== "undefined" ? window.location.href : ""}`}
        title={project.title}
        variant="fixed"
        size={18}
      />

      {/* Music Player */}
      {musicUrl && <MusicPlayer musicUrl={musicUrl} />}
    </>
  );
}
