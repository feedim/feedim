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
const TARGET_OPACITY = 0.12;

export default function AmbientLight({ imageSrc, videoMode }: AmbientLightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const failedRef = useRef(false);
  const rafRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);
  const [autoSrc, setAutoSrc] = useState<string | null>(null);
  const [momentsActive, setMomentsActive] = useState(false);
  const pathname = usePathname();

  const effectiveSrc = imageSrc || autoSrc;
  const effectiveVideoMode = videoMode || momentsActive;

  // Reset autoSrc on navigation so the glow updates for new page content
  useEffect(() => {
    if (!imageSrc) setAutoSrc(null);
  }, [pathname, imageSrc]);

  // Detect moments page via data-moments-active attribute on <html>
  useEffect(() => {
    if (!mounted || videoMode) return;
    const check = () => setMomentsActive(document.documentElement.hasAttribute("data-moments-active"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-moments-active"] });
    return () => observer.disconnect();
  }, [mounted, videoMode]);

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

  // ── Listen for live toggle from settings ──
  useEffect(() => {
    const handler = () => {
      const isOn = localStorage.getItem("fdm-ambient-light") !== "off";
      if (isOn) {
        setMounted(true);
        document.documentElement.dataset.ambientLight = "1";
      } else {
        setMounted(false);
        delete document.documentElement.dataset.ambientLight;
        restoreThemeColor();
      }
    };
    window.addEventListener("fdm-ambient-toggle", handler);
    return () => window.removeEventListener("fdm-ambient-toggle", handler);
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
    // Smooth fade-in on first paint
    requestAnimationFrame(() => {
      canvas.style.opacity = String(TARGET_OPACITY);
    });
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

    const drawToCanvas = (source: HTMLImageElement, skipTheme?: boolean) => {
      try {
        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) return;

        const shouldFade = !prevSrcRef.current || prevSrcRef.current !== effectiveSrc;
        if (shouldFade) {
          canvas.style.opacity = "0";
          requestAnimationFrame(() => {
            ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
            if (!skipTheme) syncThemeColor();
            requestAnimationFrame(() => {
              canvas.style.opacity = String(TARGET_OPACITY);
            });
          });
        } else {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
          if (!skipTheme) syncThemeColor();
        }
        prevSrcRef.current = effectiveSrc;
      } catch {
        failedRef.current = true;
      }
    };

    let corsSafe = false;
    const isCorsCandidate = (() => {
      try {
        const u = new URL(effectiveSrc, window.location.href);
        const isSameOrigin = u.origin === window.location.origin;
        // Only attempt CORS if same-origin or known CORS-enabled hosts
        const allowCorsHosts = new Set([
          window.location.host,
          "jggeqrvbdzjfomwfaoms.supabase.co",
        ]);
        return isSameOrigin || allowCorsHosts.has(u.host);
      } catch {
        return false;
      }
    })();

    const img = new Image();
    if (isCorsCandidate) {
      img.crossOrigin = "anonymous";
      corsSafe = true;
    }
    img.onload = () => {
      drawToCanvas(img, !corsSafe);
    };
    img.onerror = () => {
      // If CORS fails, retry without crossOrigin to at least show glow (no sampling)
      if (img.crossOrigin) {
        const retry = new Image();
        retry.onload = () => {
          drawToCanvas(retry, true);
        };
        retry.src = effectiveSrc;
      }
    };
    img.src = effectiveSrc;
  }, [mounted, effectiveSrc, syncThemeColor]);

  // ── Video frame sampling ──
  const videoThemeRef = useRef(0);

  const lastVideoSrcRef = useRef<string | null>(null);

  const drawVideoFrame = useCallback(() => {
    if (failedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Prefer currently playing video (important for moments with multiple videos)
    const videos = document.querySelectorAll<HTMLVideoElement>("video[src]");
    let video: HTMLVideoElement | null = null;
    for (const v of videos) {
      if (!v.paused && v.readyState >= 2) { video = v; break; }
    }
    if (!video) video = videos[0] || null;
    if (!video || video.readyState < 2) return;
    try {
      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) return;
      const currentSrc = video.currentSrc || video.src;
      const shouldFade = currentSrc && currentSrc !== lastVideoSrcRef.current;
      if (shouldFade) {
        canvas.style.opacity = "0";
        requestAnimationFrame(() => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (++videoThemeRef.current % 5 === 0) syncThemeColor();
          requestAnimationFrame(() => {
            canvas.style.opacity = String(TARGET_OPACITY);
          });
        });
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (++videoThemeRef.current % 5 === 0) syncThemeColor();
      }
      lastVideoSrcRef.current = currentSrc;
      // Sync theme-color every ~5 seconds during video (every 150 frames at 30fps sample rate)
    } catch {
      failedRef.current = true;
    }
  }, [syncThemeColor]);

  useEffect(() => {
    if (!mounted || !effectiveVideoMode) return;

    let frameCount = 0;
    let trackedVideos = new Set<HTMLVideoElement>();

    const tick = () => {
      if (++frameCount % 30 === 0) drawVideoFrame();
      rafRef.current = requestAnimationFrame(tick);
    };

    const onPlay = () => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      // Only stop if no video is playing (moments: another video may start)
      const anyPlaying = Array.from(document.querySelectorAll<HTMLVideoElement>("video[src]")).some(v => !v.paused);
      if (!anyPlaying && rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      drawVideoFrame();
    };

    const poll = setInterval(() => {
      const videos = document.querySelectorAll<HTMLVideoElement>("video[src]");
      if (videos.length === 0) return;
      // Track all videos for play/pause events (moments has multiple)
      videos.forEach(v => {
        if (!trackedVideos.has(v)) {
          trackedVideos.add(v);
          v.addEventListener("play", onPlay);
          v.addEventListener("pause", onPause);
          v.addEventListener("ended", onPause);
          if (!v.paused) onPlay();
        }
      });
    }, 150);

    return () => {
      clearInterval(poll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      trackedVideos.forEach(v => {
        v.removeEventListener("play", onPlay);
        v.removeEventListener("pause", onPause);
        v.removeEventListener("ended", onPause);
      });
      trackedVideos.clear();
    };
  }, [mounted, effectiveVideoMode, drawVideoFrame]);

  if (!mounted) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      width={16}
      height={9}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, filter: GLOW_FILTER, opacity: 0, transition: "opacity 2s ease" }}
      aria-hidden="true"
    />,
    document.body
  );
}
