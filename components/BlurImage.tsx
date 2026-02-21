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
 * - Fades in the real image on load.
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
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={loading}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
