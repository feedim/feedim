"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { decode } from "blurhash";

interface BlurImageProps {
  src: string;
  alt?: string;
  className?: string;
  blurhash?: string | null;
  width?: number;
  height?: number;
  loading?: "lazy" | "eager";
  fit?: "cover" | "contain";
  backgroundClassName?: string;
}

/**
 * Progressive image component: skeleton → blur → clear.
 * - If blurhash is available, renders a small canvas as placeholder.
 * - Otherwise, shows a skeleton pulse placeholder.
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
  fit = "cover",
  backgroundClassName = "",
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const prevSrcRef = useRef(src);

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
      // Invalid blurhash — silently fall back to skeleton
    }
  }, [blurhash, width, height]);

  // Before paint — reset on src change + skip skeleton for cached images
  useLayoutEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      setLoaded(false);
      setErrored(false);
    }
    const img = imgRef.current;
    if (img?.classList.contains("lazyloaded")) setLoaded(true);
  }, [src]);

  // Listen for lazysizes lazyloaded event
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoaded = () => setLoaded(true);
    img.addEventListener("lazyloaded", onLoaded);
    if (img.classList.contains("lazyloaded")) onLoaded();
    return () => img.removeEventListener("lazyloaded", onLoaded);
  }, []);

  const isEager = loading === "eager";
  const fitClassName = fit === "contain" ? "object-contain" : "object-cover";

  return (
    <div
      className={`relative overflow-hidden ${backgroundClassName} ${className}`}
    >
      {/* Blurhash canvas or skeleton placeholder */}
      {blurhash ? (
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${fitClassName} transition-opacity duration-300 ${loaded ? "opacity-0" : "opacity-100"}`}
        />
      ) : (
        <div
          className={`absolute inset-0 bg-bg-secondary ${loaded ? "opacity-0" : "opacity-100 animate-pulse"}`}
          style={{ transition: "opacity 250ms ease" }}
        />
      )}

      {/* Real image */}
      {errored ? (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-text-muted opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
      ) : isEager ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          className={`w-full h-full ${fitClassName} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading="eager"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      ) : (
        <img
          ref={imgRef}
          suppressHydrationWarning
          data-src={src}
          alt={alt}
          decoding="async"
          onError={() => setErrored(true)}
          className={`lazyload w-full h-full ${fitClassName} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
