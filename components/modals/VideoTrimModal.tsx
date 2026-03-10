"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import Modal from "./Modal";
import VideoEditorPreview from "@/components/VideoEditorPreview";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import { logClientError } from "@/lib/runtimeLogger";

const loadFFmpeg = () => import("@ffmpeg/ffmpeg").then(m => m.FFmpeg);
const loadFFmpegUtil = () => import("@ffmpeg/util").then(m => ({ toBlobURL: m.toBlobURL, fetchFile: m.fetchFile }));

interface VideoTrimModalProps {
  open: boolean;
  onClose: () => void;
  videoFile: File;
  duration: number;
  onTrim: (trimmedFile: File, newDuration: number) => void;
  /** Sound overlay URL — if provided, video is muted and this audio plays instead */
  soundUrl?: string;
  /** Video aspect ratio for the preview — defaults to "16/9" */
  aspectRatio?: "9/16" | "16/9";
}

export default function VideoTrimModal({
  open,
  onClose,
  videoFile,
  duration,
  onTrim,
  soundUrl,
  aspectRatio: propAspectRatio = "16/9",
}: VideoTrimModalProps) {
  const t = useTranslations("create");

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [previewUrl, setPreviewUrl] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration);
  const [trimming, setTrimming] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [playPct, setPlayPct] = useState(0);
  const [frameThumbs, setFrameThumbs] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);

  // Create preview URL
  useEffect(() => {
    if (!open || !videoFile) return;
    const url = URL.createObjectURL(videoFile);
    setPreviewUrl(url);
    setStartTime(0);
    setEndTime(duration);
    setMuted(false);
    setPaused(false);
    return () => URL.revokeObjectURL(url);
  }, [open, videoFile, duration]);

  // Sound overlay sync — play audio element alongside muted video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open || !previewUrl || !soundUrl) return;

    const audio = new Audio();
    audio.src = soundUrl;
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;

    const onAudioReady = () => {
      if (!video.paused && audio.duration) {
        audio.currentTime = video.currentTime % audio.duration;
        audio.play().catch(() => {});
      }
    };
    audio.addEventListener("canplaythrough", onAudioReady, { once: true });
    if (audio.readyState >= 4) onAudioReady();

    const onPlay = () => {
      if (audio.duration) {
        audio.currentTime = video.currentTime % audio.duration;
      }
      audio.play().catch(() => {});
    };
    const onPause = () => audio.pause();

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      audio.removeEventListener("canplaythrough", onAudioReady);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [open, previewUrl, soundUrl]);

  // Sync mute state to video + audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (soundUrl) {
      // Sound overlay: video always muted, audio gets mute toggle
      video.muted = true;
      if (audioRef.current) audioRef.current.muted = muted;
    } else {
      // Original audio: toggle video mute
      video.muted = muted;
    }
  }, [muted, soundUrl]);

  // Loop video within selected range + track playback position
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !open || !previewUrl) return;

    const checkTime = () => {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      // Update playback indicator position
      if (duration > 0) {
        setPlayPct((video.currentTime / duration) * 100);
      }
      rafRef.current = requestAnimationFrame(checkTime);
    };

    rafRef.current = requestAnimationFrame(checkTime);
    return () => cancelAnimationFrame(rafRef.current);
  }, [open, previewUrl, startTime, endTime, duration]);

  const updateDragPosition = useCallback(
    (clientX: number, activeHandle: "start" | "end") => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = +(ratio * duration).toFixed(2);

      // Minimum gap: 1 second OR enough for handles not to overlap (28px worth of duration)
      const minGap = Math.max(1, (28 / rect.width) * duration);

      if (activeHandle === "start") {
        setStartTime(Math.min(time, endTime - minGap));
      } else {
        setEndTime(Math.max(time, startTime + minGap));
      }
    },
    [duration, startTime, endTime]
  );

  const finishDrag = useCallback((activeHandle: "start" | "end") => {
    const video = videoRef.current;
    if (video) {
      if (activeHandle === "start") {
        video.currentTime = startTime;
      } else if (video.currentTime > endTime) {
        video.currentTime = startTime;
      }
    }
  }, [startTime, endTime]);

  const handlePointerDown = useCallback(
    (handle: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      updateDragPosition(e.clientX, handle);
      if (typeof (e.currentTarget as HTMLElement).setPointerCapture === "function") {
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
      }
    },
    [updateDragPosition]
  );

  const handleTouchStart = useCallback(
    (handle: "start" | "end") => (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      updateDragPosition(touch.clientX, handle);
    },
    [updateDragPosition]
  );

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      updateDragPosition(e.clientX, dragging);
    };
    const onPointerEnd = () => {
      finishDrag(dragging);
      setDragging(null);
    };
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateDragPosition(e.clientX, dragging);
    };
    const onMouseUp = () => {
      finishDrag(dragging);
      setDragging(null);
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      updateDragPosition(touch.clientX, dragging);
    };
    const onTouchEnd = () => {
      finishDrag(dragging);
      setDragging(null);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [dragging, updateDragPosition, finishDrag]);

  // Seek video when handles change
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime < startTime || video.currentTime > endTime) {
      video.currentTime = startTime;
    }
  }, [startTime, endTime]);

  // Extract frame thumbnails for timeline background
  useEffect(() => {
    if (!open || !videoFile || !duration) return;
    let cancelled = false;
    setFrameThumbs([]);

    const extract = async () => {
      const vid = document.createElement("video");
      vid.muted = true;
      vid.preload = "auto";
      vid.playsInline = true;
      const url = URL.createObjectURL(videoFile);
      vid.src = url;

      await new Promise<void>((resolve) => {
        vid.onloadeddata = () => resolve();
        vid.onerror = () => resolve();
        setTimeout(resolve, 5000);
        vid.load();
      });
      if (cancelled) { URL.revokeObjectURL(url); return; }

      const count = Math.min(Math.max(Math.ceil(duration / 2), 6), 12);
      const canvas = document.createElement("canvas");
      const ch = 44;
      const cw = vid.videoWidth && vid.videoHeight
        ? Math.round((vid.videoWidth / vid.videoHeight) * ch)
        : 25;
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); return; }

      const frames: string[] = [];
      for (let i = 0; i < count && !cancelled; i++) {
        vid.currentTime = (duration / count) * (i + 0.5);
        await new Promise<void>((resolve) => {
          const done = () => { vid.removeEventListener("seeked", done); resolve(); };
          vid.addEventListener("seeked", done);
          setTimeout(done, 1000);
        });
        if (cancelled) break;
        ctx.drawImage(vid, 0, 0, cw, ch);
        frames.push(canvas.toDataURL("image/jpeg", 0.4));
      }

      URL.revokeObjectURL(url);
      if (!cancelled && frames.length > 0) setFrameThumbs(frames);
    };

    extract().catch(() => {});
    return () => { cancelled = true; };
  }, [open, videoFile, duration]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const trimDuration = Math.max(0, +(endTime - startTime).toFixed(2));

  const handleApply = async () => {
    if (trimming) return;

    // If no trimming needed (full range selected), just close
    if (startTime <= 0.1 && endTime >= duration - 0.1) {
      onClose();
      return;
    }

    setTrimming(true);
    try {
      const FFmpeg = await loadFFmpeg();
      const { toBlobURL, fetchFile } = await loadFFmpegUtil();

      const ffmpeg = new FFmpeg();

      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });

      await ffmpeg.writeFile("input.mp4", await fetchFile(videoFile));

      await ffmpeg.exec([
        "-i", "input.mp4",
        "-ss", startTime.toFixed(3),
        "-to", endTime.toFixed(3),
        "-c", "copy",
        "-avoid_negative_ts", "make_zero",
        "-movflags", "+faststart",
        "-f", "mp4",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      await ffmpeg.deleteFile("input.mp4").catch(() => {});
      await ffmpeg.deleteFile("output.mp4").catch(() => {});
      ffmpeg.terminate();

      if (typeof data === "string") {
        setTrimming(false);
        return;
      }

      const trimmedFile = new File([data.buffer as ArrayBuffer], videoFile.name, {
        type: videoFile.type || "video/mp4",
      });

      onTrim(trimmedFile, Math.round(trimDuration));
      onClose();
    } catch (err) {
      logClientError("[VideoTrimModal] trim failed:", err);
      feedimAlert("error", t("genericErrorRetry"));
    } finally {
      setTrimming(false);
    }
  };

  const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (endTime / duration) * 100 : 100;

  const closeBtn = (
    <button onClick={onClose} className="i-btn !w-10 !h-10 text-text-muted">
      <X className="h-5 w-5" />
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("trimVideo")}
      size="sm"
      centerOnDesktop
      rightAction={closeBtn}
    >
      <div className="px-4 pb-4 space-y-4">
        {/* Video preview — shared component */}
        <VideoEditorPreview
          src={previewUrl}
          aspectRatio={propAspectRatio}
          maxWidth={propAspectRatio === "9/16" ? "180px" : "100%"}
          uploading={false}
          uploadProgress={0}
          onCancelUpload={() => {}}
          paused={paused}
          onTogglePause={() => setPaused(p => !p)}
          muted={muted}
          onToggleMute={() => setMuted(m => !m)}
          duration={duration}
          videoRef={videoRef}
          hasSoundOverlay={!!soundUrl}
          showScrubber={false}
          loop={false}
          className="!mb-1.5"
          t={t}
        />

        {/* Duration display */}
        <div className="text-center text-xs text-text-muted font-medium !mb-1">
          {fmtTime(startTime)} — {fmtTime(endTime)}{" "}
          <span className="text-text-primary font-medium">({Math.round(trimDuration)}s)</span>
        </div>

        {/* Timeline */}
        <div
          ref={trackRef}
          data-modal-no-drag
          className="relative h-16 select-none touch-none mx-2"
        >
          {/* Track with frame thumbnails */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-12 rounded-lg bg-bg-tertiary overflow-hidden">
            {frameThumbs.length > 0 ? (
              <div className="absolute inset-0 flex">
                {frameThumbs.map((thumb, i) => (
                  <img key={i} src={thumb} className="h-full flex-1 min-w-0 object-cover" alt="" draggable={false} />
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 animate-pulse" />
            )}
            {/* Left dimmed overlay */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/60"
              style={{ width: `${startPct}%` }}
            />
            {/* Right dimmed overlay */}
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/60"
              style={{ width: `${100 - endPct}%` }}
            />
          </div>

          {/* Bracket frame (selected range) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-12 pointer-events-none z-[4]"
            style={{
              left: `${startPct}%`,
              width: `${endPct - startPct}%`,
              minWidth: 28,
            }}
          >
            {/* Top border */}
            <div className="absolute top-0 h-[3px]" style={{ left: 14, right: 14, backgroundColor: "var(--accent-color)" }} />
            {/* Bottom border */}
            <div className="absolute bottom-0 h-[3px]" style={{ left: 14, right: 14, backgroundColor: "var(--accent-color)" }} />

            {/* Start handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-[14px] rounded-l-lg pointer-events-auto cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-color)" }}
              onPointerDown={handlePointerDown("start")}
              onTouchStart={handleTouchStart("start")}
            >
              <div className="w-[2.5px] h-3 rounded-full bg-white/90" />
            </div>

            {/* End handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[14px] rounded-r-lg pointer-events-auto cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-color)" }}
              onPointerDown={handlePointerDown("end")}
              onTouchStart={handleTouchStart("end")}
            >
              <div className="w-[2.5px] h-3 rounded-full bg-white/90" />
            </div>
          </div>

          {/* Playback indicator — moves between handle inner edges */}
          {(() => {
            const p = endPct > startPct ? Math.max(0, Math.min(1, (playPct - startPct) / (endPct - startPct))) : 0;
            return (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-[2px] h-10 rounded-full z-[3] pointer-events-none"
                style={{
                  left: `calc(${startPct + p * (endPct - startPct)}% + ${14 - p * 28}px)`,
                  backgroundColor: "white",
                  boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                }}
              />
            );
          })()}
        </div>

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={trimming}
          className="t-btn accept relative w-full !h-11 !text-[0.9rem] disabled:opacity-50"
        >
          {trimming ? (
            <span className="loader" style={{ width: 18, height: 18 }} />
          ) : (
            t("trimApply")
          )}
        </button>
      </div>
    </Modal>
  );
}
