"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import VideoPlayer from "@/components/VideoPlayer";

interface VideoEditorPreviewProps {
  src: string;
  poster?: string;
  aspectRatio: "9/16" | "16/9";
  maxWidth: string;
  uploading: boolean;
  uploadProgress: number;
  onCancelUpload: () => void;
  paused: boolean;
  onTogglePause: () => void;
  muted: boolean;
  onToggleMute: () => void;
  duration: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  hasSoundOverlay?: boolean;
  onRemove?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export default function VideoEditorPreview({
  src,
  poster,
  aspectRatio,
  maxWidth,
  uploading,
  uploadProgress,
  onCancelUpload,
  paused,
  onTogglePause,
  muted,
  onToggleMute,
  duration,
  videoRef: externalVideoRef,
  hasSoundOverlay,
  onRemove,
  t,
}: VideoEditorPreviewProps) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef || internalVideoRef;
  const scrubberRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);

  const [tapAnim, setTapAnim] = useState<"play" | "pause" | null>(null);
  const [scrubProgress, setScrubProgress] = useState(0);

  // Track video currentTime via RAF for scrubber
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const tick = () => {
      if (!isDraggingRef.current && video.duration > 0) {
        setScrubProgress(video.currentTime / video.duration);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [src, videoRef]);

  const handleTap = useCallback(() => {
    if (uploading) return;
    onTogglePause();
    setTapAnim(paused ? "play" : "pause");
    setTimeout(() => setTapAnim(null), 900);
  }, [uploading, paused, onTogglePause]);

  // Scrubber pointer events
  const handleScrubStart = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const video = videoRef.current;
      const bar = scrubberRef.current;
      if (!video || !bar || !video.duration) return;
      isDraggingRef.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setScrubProgress(ratio);
      video.currentTime = ratio * video.duration;
    },
    [videoRef]
  );

  const handleScrubMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      e.stopPropagation();
      const video = videoRef.current;
      const bar = scrubberRef.current;
      if (!video || !bar || !video.duration) return;

      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setScrubProgress(ratio);
      video.currentTime = ratio * video.duration;
    },
    [videoRef]
  );

  const handleScrubEnd = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = false;
  }, []);

  const effectiveMuted = hasSoundOverlay || muted;

  return (
    <div
      className="relative rounded-xl overflow-hidden bg-black cursor-pointer mx-auto"
      style={{ aspectRatio, maxWidth }}
      onClick={handleTap}
    >
      {src && (
        <VideoPlayer
          ref={videoRef}
          src={src}
          poster={poster}
          disabled={uploading}
          moment
          loop
          externalMuted={effectiveMuted}
          externalPaused={uploading || paused}
          videoClassName="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Tap play/pause feedback */}
      {tapAnim && (
        <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none animate-[fadeOut_0.9s_ease-out_forwards]">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            {tapAnim === "pause" ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-7 h-7"><path d="M8 5v14l11-7z"/></svg>
            )}
          </div>
        </div>
      )}

      {/* Remove button — top left */}
      {!uploading && src && onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2.5 left-2.5 z-[4] w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition"
          aria-label={t("removeVideo")}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      )}

      {/* Mute/unmute pill — top right */}
      {!uploading && src && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="absolute top-2.5 right-2.5 z-[4] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[0.7rem] font-medium hover:bg-black/80 transition"
        >
          {muted ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          )}
          <span>{muted ? t("noSound") : t("mute")}</span>
        </button>
      )}

      {/* Seekable scrubber — bottom of video */}
      {!uploading && src && duration > 0 && (
        <div
          ref={scrubberRef}
          className="absolute bottom-0 left-0 right-0 z-[4] h-[10px] flex items-end cursor-pointer group/scrub"
          onPointerDown={handleScrubStart}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubEnd}
          onPointerCancel={handleScrubEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full h-[3px] group-hover/scrub:h-[5px] transition-[height] relative">
            <div className="absolute inset-0 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.25)" }} />
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${scrubProgress * 100}%`, backgroundColor: "var(--accent-color)" }}
            />
          </div>
        </div>
      )}

      {/* Upload overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10">
          <span className="loader mb-3" style={{ width: 28, height: 28, borderTopColor: "var(--accent-color)" }} />
          <p className="text-white/80 text-[0.82rem] font-medium">{uploadProgress > 0 ? `%${uploadProgress}` : t("processing")}</p>
          <div className="w-48 h-1.5 bg-white/15 rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent-color)" }} />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onCancelUpload(); }} className="text-xs text-error hover:underline mt-3">
            {t("cancelUpload")}
          </button>
        </div>
      )}
    </div>
  );
}
