"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import Modal from "./Modal";
import { useTranslations } from "next-intl";

interface VideoTrimModalProps {
  open: boolean;
  onClose: () => void;
  videoFile: File;
  duration: number;
  onTrim: (trimmedFile: File, newDuration: number) => void;
  /** Sound overlay URL — if provided, video is muted and this audio plays instead */
  soundUrl?: string;
}

export default function VideoTrimModal({
  open,
  onClose,
  videoFile,
  duration,
  onTrim,
  soundUrl,
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

  // Create preview URL
  useEffect(() => {
    if (!open || !videoFile) return;
    const url = URL.createObjectURL(videoFile);
    setPreviewUrl(url);
    setStartTime(0);
    setEndTime(duration);
    setMuted(false);
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

  // Handle drag on timeline
  const handlePointerDown = useCallback(
    (handle: "start" | "end") => (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(handle);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = +(ratio * duration).toFixed(2);

      // Minimum gap: 1 second OR enough for handles not to overlap (28px worth of duration)
      const minGap = Math.max(1, (28 / rect.width) * duration);

      if (dragging === "start") {
        setStartTime(Math.min(time, endTime - minGap));
      } else {
        setEndTime(Math.max(time, startTime + minGap));
      }
    },
    [dragging, duration, startTime, endTime]
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    const video = videoRef.current;
    if (video) {
      if (dragging === "start") {
        video.currentTime = startTime;
      } else if (video.currentTime > endTime) {
        video.currentTime = startTime;
      }
    }
    setDragging(null);
  }, [dragging, startTime, endTime]);

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
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL, fetchFile } = await import("@ffmpeg/util");

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
      console.error("[VideoTrimModal] trim failed:", err);
    } finally {
      setTrimming(false);
    }
  };

  const startPct = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPct = duration > 0 ? (endTime / duration) * 100 : 100;

  const closeBtn = (
    <button onClick={onClose} className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary">
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
        {/* Video preview */}
        <div className="relative rounded-xl overflow-hidden bg-black mx-auto max-w-[240px]" style={{ aspectRatio: "9/16" }}>
          {previewUrl && (
            <video
              ref={videoRef}
              src={previewUrl}
              autoPlay
              loop
              muted={soundUrl ? true : muted}
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Mute/unmute pill */}
          <button
            type="button"
            onClick={() => setMuted(m => !m)}
            className="absolute top-2.5 right-2.5 z-[4] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[0.65rem] font-medium hover:bg-black/80 transition"
          >
            {muted ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            )}
            <span>{muted ? t("noSound") : t("mute")}</span>
          </button>
        </div>

        {/* Duration display */}
        <div className="text-center text-sm text-text-muted tabular-nums">
          {fmtTime(startTime)} — {fmtTime(endTime)}{" "}
          <span className="text-text-primary font-medium">({Math.round(trimDuration)}s)</span>
        </div>

        {/* Timeline */}
        <div
          ref={trackRef}
          className="relative h-16 select-none touch-none mx-2"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Track with frame thumbnails */}
          <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-12 rounded-lg bg-bg-tertiary overflow-hidden">
            {frameThumbs.length > 0 && (
              <div className="absolute inset-0 flex">
                {frameThumbs.map((thumb, i) => (
                  <img key={i} src={thumb} className="h-full flex-1 min-w-0 object-cover" alt="" draggable={false} />
                ))}
              </div>
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
            >
              <div className="w-[2.5px] h-3 rounded-full bg-white/90" />
            </div>

            {/* End handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-[14px] rounded-r-lg pointer-events-auto cursor-grab active:cursor-grabbing flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-color)" }}
              onPointerDown={handlePointerDown("end")}
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
