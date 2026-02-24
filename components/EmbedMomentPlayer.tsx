"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import VideoPlayer from "@/components/VideoPlayer";

interface EmbedMomentPlayerProps {
  src: string;
  poster?: string;
}

export default function EmbedMomentPlayer({ src, poster }: EmbedMomentPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  // Progress bar RAF
  useEffect(() => {
    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration && !v.paused) {
        setProgress((v.currentTime / v.duration) * 100);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const togglePause = useCallback(() => setPaused(p => !p), []);
  const toggleMute = useCallback(() => setMuted(m => !m), []);

  return (
    <div className="relative w-full h-full bg-black" onClick={togglePause}>
      <VideoPlayer
        ref={videoRef}
        src={src}
        poster={poster}
        moment
        loop
        externalPaused={paused}
        externalMuted={muted}
        videoClassName="w-full h-full object-contain"
      />

      {/* Pause icon overlay */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg className="h-7 w-7 text-white ml-0.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
      )}

      {/* Mute button — top right */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        className="absolute top-3 right-3 z-[6] w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
      >
        {muted ? (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="white"><path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z" /></svg>
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>
        )}
      </button>

      {/* Progress bar — bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-[6]">
        <div className="h-full bg-white/80 transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
