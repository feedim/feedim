"use client";

import { useRef, useEffect, useLayoutEffect, useState, useCallback, memo } from "react";
import { sanitizeAvatarUrl } from "@/lib/avatarUrl";

interface LazyAvatarProps {
  src?: string | null;
  alt?: string;
  sizeClass: string;
  className?: string;
  borderClass?: string;
}

export default memo(function LazyAvatar({
  src,
  alt = "",
  sizeClass,
  className = "",
  borderClass = "border border-border-primary",
}: LazyAvatarProps) {
  const sanitizedSrc = sanitizeAvatarUrl(src);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const avatarBorderStyle = /\bborder\b/.test(borderClass) ? { borderWidth: "0.9px" } : undefined;

  useEffect(() => { setLoaded(false); }, [sanitizedSrc]);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.classList.contains("lazyloaded")) setLoaded(true);
  }, [sanitizedSrc]);

  const markLoaded = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.addEventListener("lazyloaded", markLoaded);
    if (img.classList.contains("lazyloaded")) markLoaded();
    return () => img.removeEventListener("lazyloaded", markLoaded);
  }, [markLoaded]);

  if (!sanitizedSrc) {
    return (
      <img
        className={`default-avatar-auto bg-bg-tertiary ${sizeClass} rounded-full object-cover ${borderClass} ${className}`}
        alt=""
        loading="lazy"
        style={avatarBorderStyle}
      />
    );
  }

  return (
    <div className={`relative ${sizeClass} ${className}`}>
      <div
        className={`w-full h-full rounded-full overflow-hidden ${borderClass}`}
        style={{
          ...avatarBorderStyle,
          filter: loaded ? "blur(0px)" : "blur(3px)",
          transition: loaded ? "filter 200ms ease 80ms" : "none",
          transform: "translateZ(0)",
        }}
      >
        <img
          ref={imgRef}
          suppressHydrationWarning
          data-src={sanitizedSrc}
          alt={alt}
          decoding="async"
          className="lazyload w-full h-full object-cover bg-bg-tertiary"
        />
      </div>
      <div
        className={`absolute inset-0 rounded-full bg-bg-tertiary ${borderClass} ${
          loaded ? "opacity-0 pointer-events-none" : "opacity-100 animate-pulse"
        }`}
        style={{ ...avatarBorderStyle, transition: "opacity 250ms ease" }}
      />
    </div>
  );
});
