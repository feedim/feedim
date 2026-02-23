"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

// Global: only one preview plays at a time
let activePreview: { stop: () => void } | null = null;

interface SoundPreviewButtonProps {
  audioUrl: string;
  className?: string;
}

export default function SoundPreviewButton({ audioUrl, className = "" }: SoundPreviewButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    clearTimeout(timerRef.current);
    if (activePreview?.stop === stop) activePreview = null;
  }, []);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (playing) {
      stop();
      return;
    }

    // Stop any other playing preview
    if (activePreview) activePreview.stop();

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.preload = "auto";
      audioRef.current.addEventListener("ended", stop);
    } else if (audioRef.current.src !== audioUrl) {
      audioRef.current.src = audioUrl;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setPlaying(true);
    activePreview = { stop };
    // Auto-stop after 15s
    timerRef.current = setTimeout(stop, 15000);
  }, [audioUrl, playing, stop]);

  useEffect(() => {
    return () => {
      stop();
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", stop);
        audioRef.current = null;
      }
    };
  }, [stop]);

  return (
    <button
      onClick={toggle}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition shrink-0 ${
        playing
          ? "bg-accent-main text-white"
          : "bg-bg-tertiary hover:bg-accent-main/20 text-text-muted"
      } ${className}`}
      aria-label={playing ? "Durdur" : "Dinle"}
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
    </button>
  );
}
