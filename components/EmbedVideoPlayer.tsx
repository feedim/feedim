"use client";

import { useState, useCallback } from "react";
import VideoPlayer from "@/components/VideoPlayer";

interface EmbedVideoPlayerProps {
  src: string;
  poster?: string;
}

export default function EmbedVideoPlayer({ src, poster }: EmbedVideoPlayerProps) {
  const [ended, setEnded] = useState(false);
  const [key, setKey] = useState(0);

  const handleEnded = useCallback(() => {
    setEnded(true);
  }, []);

  const handleReplay = useCallback(() => {
    setEnded(false);
    setKey((k) => k + 1);
  }, []);

  return (
    <div className="relative w-full h-full">
      <VideoPlayer
        key={key}
        src={src}
        poster={poster}
        autoStart
        onEnded={handleEnded}
      />
      {ended && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[10]">
          <button
            onClick={handleReplay}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Yeniden Oynat
          </button>
        </div>
      )}
    </div>
  );
}
