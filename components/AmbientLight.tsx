"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";

interface AmbientLightProps {
  /** Featured image URL — drawn immediately as initial glow source */
  imageSrc?: string;
  /** When true, switches to sampling live video frames once playback starts */
  videoMode?: boolean;
}

/** Sample canvas pixels and return the dominant dark-blended color for theme-color */
function sampleThemeColor(canvas: HTMLCanvasElement, theme: string): string | null {
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    if (count === 0) return null;
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Blend with the theme's base background for a subtle tint
    if (theme === "dark") {
      // Mix ~18% of the image color into #090909
      r = Math.round(9 + r * 0.18);
      g = Math.round(9 + g * 0.18);
      b = Math.round(9 + b * 0.18);
    } else if (theme === "dim") {
      // Mix ~15% into #0e1520
      r = Math.round(14 + r * 0.15);
      g = Math.round(21 + g * 0.15);
      b = Math.round(32 + b * 0.15);
    } else {
      // Light: mix ~12% into #ffffff
      r = Math.round(255 - (255 - r) * 0.12);
      g = Math.round(255 - (255 - g) * 0.12);
      b = Math.round(255 - (255 - b) * 0.12);
    }

    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch {
    return null;
  }
}

function updateThemeColorMeta(color: string) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", color);
}

/** Restore theme-color to the base theme value */
function restoreThemeColor() {
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const base: Record<string, string> = { light: "#ffffff", dark: "#090909", dim: "#0e1520" };
  updateThemeColorMeta(base[theme] || "#ffffff");
}

const GLOW_FILTER = "blur(150px) saturate(1.5)";

export default function AmbientLight({ imageSrc, videoMode }: AmbientLightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const failedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);
  const [autoSrc, setAutoSrc] = useState<string | null>(null);
  const pathname = usePathname();

  const effectiveSrc = imageSrc || autoSrc;

  // Reset autoSrc on navigation so the glow updates for new page content
  useEffect(() => {
    if (!imageSrc) setAutoSrc(null);
  }, [pathname, imageSrc]);

  // ── Mount & html attribute (respect user preference) ──
  useEffect(() => {
    if (localStorage.getItem("fdm-ambient-light") === "off") return;
    setMounted(true);
    document.documentElement.dataset.ambientLight = "1";
    return () => {
      delete document.documentElement.dataset.ambientLight;
      restoreThemeColor();
    };
  }, []);

  // ── Sync theme-color after canvas draw ──
  const syncThemeColor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const color = sampleThemeColor(canvas, theme);
    if (color) updateThemeColorMeta(color);
  }, []);

  // ── Default warm glow on mount (prevents blank flash during page transitions) ──
  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;
    // Warm orange default glow
    ctx.fillStyle = "#d44800";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    syncThemeColor();
  }, [mounted, syncThemeColor]);

  // ── Auto-detect: scan page for first large image when no explicit src ──
  useEffect(() => {
    if (!mounted || imageSrc) return;

    const findImage = () => {
      const images = document.querySelectorAll<HTMLImageElement>("img[src]");
      for (const img of images) {
        // Skip tiny images (avatars ≤48px, icons)
        if (img.naturalWidth > 0 && img.naturalWidth < 120) continue;
        if (img.width < 120 && img.height < 80) continue;
        // Skip placeholders
        const src = img.src;
        if (src.includes("default-avatar") || src.includes("no-image") || src.includes("data:")) continue;
        // Skip SVGs (usually icons/logos)
        if (src.endsWith(".svg")) continue;
        setAutoSrc(src);
        return;
      }
    };

    // Quick initial scan
    findImage();
    // Re-scan shortly after in case content loaded late
    const timer = setTimeout(findImage, 200);

    // Watch for new images appearing (lazy-loaded content)
    const observer = new MutationObserver(() => {
      // Only scan if we don't have a source yet
      if (!autoSrc) findImage();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, imageSrc, pathname]);

  // ── Draw a single image to the canvas with crossfade ──
  const prevSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mounted || !effectiveSrc || failedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawToCanvas = (source: HTMLImageElement) => {
      try {
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) return;

        // Crossfade: dim out, draw, dim in
        if (prevSrcRef.current && prevSrcRef.current !== effectiveSrc) {
          canvas.style.opacity = "0";
          setTimeout(() => {
            ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
            canvas.style.opacity = "0.12";
            syncThemeColor();
          }, 400);
        } else {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          syncThemeColor();
        }
        prevSrcRef.current = effectiveSrc;
      } catch {
        failedRef.current = true;
      }
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => drawToCanvas(img);
    img.onerror = () => {
      // If CORS fails on auto-detected image, try without crossOrigin
      if (img.crossOrigin) {
        const retry = new Image();
        retry.onload = () => drawToCanvas(retry);
        retry.src = effectiveSrc;
      }
    };
    img.src = effectiveSrc;
  }, [mounted, effectiveSrc, syncThemeColor]);

  // ── Video frame sampling ──
  const videoThemeRef = useRef(0);

  const drawVideoFrame = useCallback(() => {
    if (failedRef.current) return;
    const canvas = canvasRef.current;
    const video = document.querySelector("video[src]") as HTMLVideoElement | null;
    if (!canvas || !video || video.readyState < 2) return;
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Sync theme-color every ~5 seconds during video (every 150 frames at 30fps sample rate)
      if (++videoThemeRef.current % 5 === 0) syncThemeColor();
    } catch {
      failedRef.current = true;
    }
  }, [syncThemeColor]);

  useEffect(() => {
    if (!mounted || !videoMode) return;

    let frameCount = 0;
    let video: HTMLVideoElement | null = null;

    const tick = () => {
      if (++frameCount % 30 === 0) drawVideoFrame();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      drawVideoFrame();
    };

    const poll = setInterval(() => {
      video = document.querySelector("video[src]") as HTMLVideoElement | null;
      if (!video) return;
      clearInterval(poll);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("ended", onPause);
      if (!video.paused) onPlay();
    }, 150);

    return () => {
      clearInterval(poll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (video) {
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("ended", onPause);
      }
    };
  }, [mounted, videoMode, drawVideoFrame]);

  if (!mounted) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      width={16}
      height={9}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, filter: GLOW_FILTER, opacity: 0.12, transition: "opacity 0.8s ease" }}
      aria-hidden="true"
    />,
    document.body
  );
}
