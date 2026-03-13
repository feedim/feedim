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
  borderOnLoad?: boolean;
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
  borderOnLoad = true,
  fit = "cover",
  backgroundClassName = "",
}: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);
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
      className={`relative overflow-hidden ${backgroundClassName} ${className} ${borderOnLoad && loaded ? "border border-border-primary" : ""}`}
      style={borderOnLoad && loaded ? { borderWidth: "0.9px" } : undefined}
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
      {isEager ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          className={`w-full h-full ${fitClassName} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          loading="eager"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <img
          ref={imgRef}
          suppressHydrationWarning
          data-src={src}
          alt={alt}
          decoding="async"
          className={`lazyload w-full h-full ${fitClassName} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
