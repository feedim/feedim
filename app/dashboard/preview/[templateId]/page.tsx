"use client";

import { useEffect, useState, useRef } from "react";
import { Heart } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import MusicPlayer from "@/components/MusicPlayer";

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

export default function PreviewPage() {
  const [html, setHtml] = useState<string>("");
  const [templateScripts, setTemplateScripts] = useState<string[]>([]);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  // Reset layout background so template CSS takes effect + ensure scroll works on mobile
  useEffect(() => {
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.overscrollBehavior = 'auto';
    document.body.style.overscrollBehavior = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.height = 'auto';
    // Force touch scrolling on iOS/Android
    (document.body.style as any).webkitOverflowScrolling = 'touch';
    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.overscrollBehavior = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.documentElement.style.height = '';
      document.body.style.height = '';
    };
  }, []);

  // Anti-theft: block devtools shortcuts, right-click, text selection on preview page
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F12') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'U') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toUpperCase() === 'S') { e.preventDefault(); return; }
    };
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const handleSelectStart = (e: Event) => { e.preventDefault(); };
    document.addEventListener('keydown', handleKeydown, true);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    return () => {
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("forilove_preview");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const { cleanHtml, scripts } = extractScripts(data.html || "");
      // Sanitize then strip template metadata attributes to hinder HTML theft
      let sanitized = DOMPurify.sanitize(cleanHtml, { WHOLE_DOCUMENT: true, ADD_TAGS: ['iframe', 'video', 'audio', 'source', 'style', 'link'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'media', 'rel', 'crossorigin', 'href', 'as'], ALLOW_DATA_ATTR: false });
      // Remove data-area attributes too (used for section toggling)
      sanitized = sanitized.replace(/\s*data-(?:editable|type|hook|locked|label|clickable|area|area-label|css-property|list-[a-z-]+|duplicate)="[^"]*"/g, '');
      setHtml(sanitized);
      setTemplateScripts(scripts);
      setMusicUrl(data.musicUrl || "");
      if (data.templateName) {
        document.title = `Önizleme - ${data.templateName}`;
      }
    } catch (e) { if (process.env.NODE_ENV === 'development') console.warn('Operation failed:', e); }
    setLoaded(true);
  }, []);

  // Inject font <link> tags into document <head> for reliable cross-platform loading
  useEffect(() => {
    if (!html) return;
    const fontLinkRegex = /<link[^>]*href="[^"]*fonts\.googleapis\.com[^"]*"[^>]*>/gi;
    const preconnectRegex = /<link[^>]*rel="preconnect"[^>]*href="[^"]*fonts\.[^"]*"[^>]*>/gi;
    const allLinks = [...(html.match(fontLinkRegex) || []), ...(html.match(preconnectRegex) || [])];
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
  }, [html]);

  // Run extracted template scripts after DOM render — wait for paint then execute
  useEffect(() => {
    if (!templateScripts.length || !html) return;
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
  }, [html, templateScripts]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Heart className="h-10 w-10 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  if (!html) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Önizleme verisi bulunamadı. Editörden tekrar deneyin.</p>
      </div>
    );
  }

  return (
    <>
      {/* Preview Banner */}
      <div className="sticky top-0 z-50 flex items-center justify-center" style={{ height: 30, background: 'lab(49.5493% 79.8381 2.31768)' }}>
        <span className="text-white" style={{ fontSize: 11, fontWeight: 600 }}>Önizleme Modu</span>
      </div>

      {/* Template Content */}
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        className="html-template-render"
        suppressHydrationWarning
      />

      {/* Music Player */}
      {musicUrl && <MusicPlayer musicUrl={musicUrl} />}
    </>
  );
}
