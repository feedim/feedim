"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import MusicPlayer from "@/components/MusicPlayer";

export default function PreviewPage() {
  const [html, setHtml] = useState<string>("");
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("forilove_preview");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setHtml(DOMPurify.sanitize(data.html || "", { WHOLE_DOCUMENT: true, ADD_TAGS: ["style", "link", "iframe"], ADD_ATTR: ["target", "allow", "allowfullscreen", "frameborder", "data-editable", "data-type", "data-hook"] }));
      setMusicUrl(data.musicUrl || "");
      if (data.templateName) {
        document.title = `Önizleme - ${data.templateName}`;
      }
    } catch {}
    setLoaded(true);
  }, []);

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
