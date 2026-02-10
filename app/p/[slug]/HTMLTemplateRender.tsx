"use client";

import { useEffect } from "react";
import { Heart } from "lucide-react";
import { escapeHtml, sanitizeUrl } from "@/lib/security/sanitize";
import DOMPurify from 'isomorphic-dompurify';
import MusicPlayer from "@/components/MusicPlayer";
import ShareIconButton from "@/components/ShareIconButton";

export function HTMLTemplateRender({ project, musicUrl }: { project: any; musicUrl?: string }) {
  const template = project.templates;
  const htmlData = project.hook_values || {};

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
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (!template?.html_content) {
    return <div>Template bulunamadı</div>;
  }

  let html = template.html_content;

  // Simple string replacement for rendering with XSS protection
  Object.entries(htmlData).forEach(([key, value]) => {
    const stringValue = String(value);

    // Match data-editable elements and replace their content/attributes
    const regex = new RegExp(`(<[^>]*data-editable="${key}"[^>]*>)(.*?)(<\\/[^>]+>)`, 'gs');
    html = html.replace(regex, (match: string, openTag: string, content: string, closeTag: string) => {
      // Check if it's an image or URL type
      if (openTag.includes('data-type="image"') || openTag.includes('data-type="url"')) {
        const sanitizedUrl = sanitizeUrl(stringValue);
        return openTag.replace(/src="[^"]*"/, `src="${sanitizedUrl}"`) + content + closeTag;
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
      // For text content - escape HTML to prevent XSS
      const sanitizedText = escapeHtml(stringValue);
      return openTag + sanitizedText + closeTag;
    });

    // Handle src attributes for images
    const srcRegex = new RegExp(`(<img[^>]*data-editable="${key}"[^>]*src=")[^"]*"`, 'g');
    const sanitizedUrl = sanitizeUrl(stringValue);
    html = html.replace(srcRegex, `$1${sanitizedUrl}"`);
  });

  // Sanitize HTML with DOMPurify before rendering
  const sanitizedHtml = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    ADD_TAGS: ['iframe', 'video', 'audio', 'source', 'style', 'link'],
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'data-editable', 'data-type', 'data-label', 'media'],
    ALLOW_DATA_ATTR: true,
  });

  return (
    <>
      <div
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        className="html-template-render"
        suppressHydrationWarning
      />

      {/* Forilove Bottom Branding */}
      <a href="/" target="_blank" className="flex items-center justify-center no-underline" style={{ height: 34, background: 'lab(49.5493% 79.8381 2.31768)', gap: 8, textDecoration: 'none' }}>
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
