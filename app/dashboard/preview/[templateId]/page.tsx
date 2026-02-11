"use client";

import { useEffect, useState, useRef } from "react";
import { Heart } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import MusicPlayer from "@/components/MusicPlayer";

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

export default function PreviewPage() {
  const [html, setHtml] = useState<string>("");
  const [templateScripts, setTemplateScripts] = useState<string[]>([]);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("forilove_preview");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const { cleanHtml, scripts } = extractScripts(data.html || "");
      setHtml(DOMPurify.sanitize(cleanHtml, { WHOLE_DOCUMENT: true, ADD_TAGS: ["style", "link", "iframe"], ADD_ATTR: ["target", "allow", "allowfullscreen", "frameborder", "data-editable", "data-type", "data-hook"], ALLOW_DATA_ATTR: true }));
      setTemplateScripts(scripts);
      setMusicUrl(data.musicUrl || "");
      if (data.templateName) {
        document.title = `Önizleme - ${data.templateName}`;
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Run extracted template scripts after DOM render
  useEffect(() => {
    if (!templateScripts.length || !html) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    templateScripts.forEach((code, i) => {
      const t = setTimeout(() => {
        try { new Function(code)(); } catch (e) {
          if (process.env.NODE_ENV === 'development') console.warn('Template script error:', e);
        }
      }, 100 * (i + 1));
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
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
