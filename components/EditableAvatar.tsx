"use client";

import { memo } from "react";

interface EditableAvatarProps {
  src?: string | null;
  alt?: string;
  sizeClass: string;
  editable?: boolean;
  loading?: boolean;
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
  onClick,
  onLoad,
  onError,
  className,
  imgClassName,
}: EditableAvatarProps) {
  return (
    <button
      onClick={onClick}
      className={`relative block group ${editable ? "cursor-pointer" : ""} ${className || ""}`}
      aria-label="Profil fotoğrafını görüntüle"
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClass} rounded-full object-cover ${imgClassName || ""}`}
          loading="lazy"
          onLoad={onLoad}
          onError={onError}
        />
      ) : (
        <img
          className={`default-avatar-auto ${sizeClass} rounded-full object-cover ${imgClassName || ""}`}
          alt=""
          loading="lazy"
        />
      )}

      {loading && (
        <div className="absolute inset-0 rounded-full bg-black/70 flex items-center justify-center">
          <span className="loader" style={{ width: 22, height: 22 }} />
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
