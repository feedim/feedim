"use client";

import { memo, useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface EditableAvatarProps {
  src?: string | null;
  alt?: string;
  sizeClass: string;
  editable?: boolean;
  loading?: boolean;
  /** Skip blur/skeleton — show dark overlay + spinner instead */
  noBlur?: boolean;
  onClick?: () => void;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  imgClassName?: string;
}

export default memo(function EditableAvatar({
  src,
  alt = "",
  sizeClass,
  editable = false,
  loading = false,
  noBlur = false,
  onClick,
  onLoad,
  onError,
  className,
  imgClassName,
}: EditableAvatarProps) {
  const t = useTranslations("profile");
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => { setImgLoaded(false); }, [src]);

  // Before paint — if cached, skip skeleton entirely
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (img?.classList.contains("lazyloaded")) setImgLoaded(true);
  }, [src]);

  const markLoaded = useCallback(() => {
    setImgLoaded(true);
    onLoad?.();
  }, [onLoad]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.addEventListener("lazyloaded", markLoaded);
    if (img.classList.contains("lazyloaded")) markLoaded();
    return () => img.removeEventListener("lazyloaded", markLoaded);
  }, [markLoaded]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !onError) return;
    const handler = () => onError();
    img.addEventListener("error", handler);
    return () => img.removeEventListener("error", handler);
  }, [onError]);

  return (
    <button
      onClick={onClick}
      className={`relative block group ${editable ? "cursor-pointer" : ""} ${className || ""}`}
      aria-label={t("viewAvatar")}
    >
      {src ? (
        <>
          {/* Image wrapper — skip blur when noBlur (upload areas show dark overlay instead) */}
          <div
            className={`${sizeClass} rounded-full overflow-hidden border border-border-primary`}
            style={{
              filter: noBlur ? "none" : imgLoaded ? "blur(0px)" : "blur(3px)",
              transition: !noBlur && imgLoaded ? "filter 200ms ease 80ms" : "none",
              transform: "translateZ(0)",
            }}
          >
            <img
              ref={imgRef}
              data-src={src}
              alt={alt}
              className={`lazyload w-full h-full object-cover bg-bg-tertiary ${imgClassName || ""}`}
            />
          </div>
          {/* Skeleton pulse — hide when noBlur */}
          {!noBlur && (
            <div
              className={`absolute inset-0 rounded-full bg-bg-tertiary border border-border-primary ${
                imgLoaded ? "opacity-0 pointer-events-none" : "opacity-100 animate-pulse"
              }`}
              style={{ transition: "opacity 250ms ease" }}
            />
          )}
        </>
      ) : (
        <img
          className={`default-avatar-auto bg-bg-tertiary ${sizeClass} rounded-full object-cover border border-border-primary ${imgClassName || ""}`}
          alt=""
        />
      )}

      {loading && (
        <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
          <span className="loader" style={{ width: 22, height: 22, borderTopColor: "#fff" }} />
        </div>
      )}

      {editable && !loading && (
        <>
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/35 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z"></path>
              <circle cx="12" cy="13" r="3"></circle>
            </svg>
          </div>
        </>
      )}
    </button>
  );
});
