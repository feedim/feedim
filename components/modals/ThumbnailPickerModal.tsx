"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload } from "lucide-react";
import Modal from "./Modal";
import { useTranslations } from "next-intl";

interface ThumbnailPickerModalProps {
  open: boolean;
  onClose: () => void;
  videoFile: File;
  duration: number;
  /** Aspect ratio of the video — "16:9" or "9:16" */
  aspectRatio?: "16:9" | "9:16";
  onSelect: (thumbnailDataUrl: string) => void;
}

export default function ThumbnailPickerModal({
  open,
  onClose,
  videoFile,
  duration,
  aspectRatio = "9:16",
  onSelect,
}: ThumbnailPickerModalProps) {
  const t = useTranslations("create");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [previewUrl, setPreviewUrl] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [frameThumbs, setFrameThumbs] = useState<string[]>([]);
  const [framePreview, setFramePreview] = useState("");

  // Create preview URL
  useEffect(() => {
    if (!open || !videoFile) return;
    const url = URL.createObjectURL(videoFile);
    setPreviewUrl(url);
    setCurrentTime(0);
    setFramePreview("");
    return () => URL.revokeObjectURL(url);
  }, [open, videoFile]);

  // Capture current frame whenever time changes
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setFramePreview(dataUrl);
  }, []);

  // Seek video and capture frame when currentTime changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl) return;

    const onSeeked = () => {
      captureFrame();
    };

    video.addEventListener("seeked", onSeeked);
    video.currentTime = currentTime;

    return () => {
      video.removeEventListener("seeked", onSeeked);
    };
  }, [currentTime, previewUrl, captureFrame]);

  // Capture initial frame when video loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl) return;

    const onLoaded = () => {
      video.currentTime = 0;
      setTimeout(captureFrame, 100);
    };

    video.addEventListener("loadeddata", onLoaded);
    return () => video.removeEventListener("loadeddata", onLoaded);
  }, [previewUrl, captureFrame]);

  // Handle drag on timeline
  const updateTimeFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current || !duration) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setCurrentTime(+(ratio * duration).toFixed(2));
    },
    [duration]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateTimeFromPointer(e.clientX);
    },
    [updateTimeFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      updateTimeFromPointer(e.clientX);
    },
    [dragging, updateTimeFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

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

  // Handle custom image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 5 * 1024 * 1024) return;
      const { compressImage } = await import("@/lib/imageCompression");
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Read failed"));
        reader.readAsDataURL(compressed);
      });
      onSelect(dataUrl);
      onClose();
    } catch {}
    e.target.value = "";
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleApply = () => {
    if (framePreview) {
      onSelect(framePreview);
      onClose();
    }
  };

  const scrubPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const closeBtn = (
    <button onClick={onClose} className="i-btn !w-10 !h-10 text-text-muted hover:text-text-primary">
      <X className="h-5 w-5" />
    </button>
  );

  const previewAspect = aspectRatio === "16:9" ? "16/9" : "9/16";
  const previewMaxW = aspectRatio === "16:9" ? "360px" : "240px";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("thumbnailPickerTitle")}
      size="sm"
      centerOnDesktop
      rightAction={closeBtn}
    >
      <div className="px-4 pb-4 space-y-4">
        {/* Hidden video for seeking */}
        {previewUrl && (
          <video
            ref={videoRef}
            src={previewUrl}
            muted
            playsInline
            preload="auto"
            className="hidden"
          />
        )}
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Frame preview */}
        <div
          className="relative rounded-xl overflow-hidden bg-black mx-auto"
          style={{ aspectRatio: previewAspect, maxWidth: previewMaxW }}
        >
          {framePreview ? (
            <img
              src={framePreview}
              alt={t("thumbnail")}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="loader" style={{ width: 24, height: 24 }} />
            </div>
          )}
        </div>

        {/* Time display */}
        <div className="text-center text-sm text-text-muted tabular-nums">
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </div>

        {/* Timeline scrubber */}
        <div
          ref={trackRef}
          className="relative h-16 select-none touch-none mx-2 cursor-pointer"
          onPointerDown={handlePointerDown}
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
          </div>

          {/* Scrubber indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-[3px] h-14 rounded-full z-[4] pointer-events-none"
            style={{
              left: `${scrubPct}%`,
              backgroundColor: "var(--accent-color)",
              boxShadow: "0 0 6px rgba(0,0,0,0.4)",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Handle dot */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--accent-color)", boxShadow: "0 0 4px rgba(0,0,0,0.3)" }}
            />
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
              style={{ backgroundColor: "var(--accent-color)", boxShadow: "0 0 4px rgba(0,0,0,0.3)" }}
            />
          </div>
        </div>

        {/* Apply button */}
        <button
          onClick={handleApply}
          disabled={!framePreview}
          className="t-btn accept relative w-full !h-11 !text-[0.9rem] disabled:opacity-50"
        >
          {t("thumbnailSelectFrame")}
        </button>

        {/* Upload image link */}
        <label className="flex items-center justify-center gap-1.5 w-full py-2 text-sm text-accent-main hover:text-accent-main/80 font-medium cursor-pointer transition">
          <Upload className="h-3.5 w-3.5" />
          {t("thumbnailUploadImage")}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        </label>
      </div>
    </Modal>
  );
}
