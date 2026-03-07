"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { useTranslations } from "next-intl";

// Global: only one preview plays at a time
let activePreview: { stop: () => void } | null = null;

// Global event for cross-component audio coordination
// When a sound preview starts, it dispatches 'feedim:audio-claim' so
// other audio sources (VideoPlayer, PostCard previews, etc.) can pause.
export function stopAllSoundPreviews() {
  if (activePreview) activePreview.stop();
}

interface SoundPreviewButtonProps {
  audioUrl: string;
  className?: string;
  size?: "sm" | "md";
}

export default function SoundPreviewButton({ audioUrl, className = "", size = "md" }: SoundPreviewButtonProps) {
  const t = useTranslations("sounds");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const stop = useCallback(function stopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    clearTimeout(timerRef.current);
    if (activePreview?.stop === stopPreview) activePreview = null;
  }, []);

  // Listen for external audio-claim events (e.g. when a video starts playing)
  useEffect(() => {
    const handler = () => { if (playing) stop(); };
    window.addEventListener("feedim:audio-claim", handler);
    return () => window.removeEventListener("feedim:audio-claim", handler);
  }, [playing, stop]);

  const toggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (playing) {
      stop();
      return;
    }

    // Stop any other playing preview
    if (activePreview) activePreview.stop();

    // Notify other audio sources to pause
    window.dispatchEvent(new Event("feedim:audio-claim"));

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

  const sizeClasses = size === "sm"
    ? "w-7 h-7"
    : "w-8 h-8";
  const iconClasses = size === "sm"
    ? "h-3 w-3"
    : "h-3.5 w-3.5";

  return (
    <button
      onClick={toggle}
      className={`${sizeClasses} rounded-full flex items-center justify-center transition shrink-0 ${
        playing
          ? "bg-accent-main text-white"
          : "bg-bg-tertiary hover:bg-accent-main/20 text-text-muted"
      } ${className}`}
      aria-label={playing ? t("stopPreview") : t("listenPreview")}
    >
      {playing ? <Pause className={iconClasses} strokeWidth={2.5} /> : <Play className={`${iconClasses} ml-0.5`} strokeWidth={2.5} />}
    </button>
  );
}
