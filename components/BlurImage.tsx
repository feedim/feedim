"use client";

import { useState, useRef, useEffect } from "react";
import { decode } from "blurhash";

interface BlurImageProps {
  src: string;
  alt?: string;
  className?: string;
  blurhash?: string | null;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
}

/**
 * Progressive image component with CSS shimmer + optional blurhash canvas.
 * - If blurhash is available, renders a small canvas as placeholder.
 * - Otherwise, shows a subtle shimmer animation.
 * - Uses lazysizes for lazy loading with blur-up transition.
 */
export default function BlurImage({
  src,
  alt = "",
  className = "",
  blurhash,
  width = 32,
  height = 32,
  loading = "lazy",
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!blurhash || !canvasRef.current) return;
    try {
      const pixels = decode(blurhash, width, height);
      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(pixels);
      ctx.putImageData(imageData, 0, 0);
    } catch {
      // Invalid blurhash — silently fall back to shimmer
    }
  }, [blurhash, width, height]);

  // Listen for lazysizes lazyloaded event
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoaded = () => setLoaded(true);
    img.addEventListener("lazyloaded", onLoaded);
    // If already loaded (e.g. cached), mark as loaded
    let frame = 0;
    if (img.classList.contains("lazyloaded")) {
      frame = requestAnimationFrame(onLoaded);
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      img.removeEventListener("lazyloaded", onLoaded);
    };
  }, []);

  const isEager = loading === "eager";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blurhash canvas or shimmer placeholder */}
      {blurhash ? (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-bg-secondary transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`}
          style={{
            backgroundImage: "linear-gradient(90deg, transparent 0%, var(--bg-tertiary) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: loaded ? "none" : "shimmer 1.5s ease-in-out infinite",
          }}
        />
      )}

      {/* Real image */}
      {isEager ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading="eager"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <img
          ref={imgRef}
          data-src={src}
          alt={alt}
          decoding="async"
          className={`lazyload w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
