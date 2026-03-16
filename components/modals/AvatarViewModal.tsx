"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";
import { lockScroll, unlockScroll } from "@/lib/scrollLock";
import { useTranslations } from "next-intl";
import { useHydrated } from "@/lib/useHydrated";

interface AvatarViewModalProps {
  open: boolean;
  onClose: () => void;
  avatarUrl: string | null;
  name: string;
  isOwn?: boolean;
  onEdit?: () => void;
}

export default function AvatarViewModal({ open, onClose, avatarUrl, name, isOwn, onEdit }: AvatarViewModalProps) {
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("profile");
  const hydrated = useHydrated();
  const [closing, setClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (open) {
      lockScroll();
    }
    return () => {
      if (open) unlockScroll();
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setImageLoaded(false);
      onClose();
    }, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [handleClose, open]);

  if (!open || !hydrated) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-200 ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
        aria-label={tCommon("closeModal")}
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      {/* Avatar image */}
      <div
        className={`relative ${
          closing
            ? "animate-[scaleOut_0.2s_ease-in_forwards]"
            : "animate-[scaleIn_0.2s_ease-out]"
        }`}
      >
        {avatarUrl ? (
          <>
            {/* Loader */}
            {!imageLoaded && (
              <div className="w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full flex items-center justify-center">
                <span className="loader" style={{ width: 32, height: 32 }} />
              </div>
            )}
            <img
              src={avatarUrl}
              alt={name}
              onLoad={() => setImageLoaded(true)}
              className={`w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full object-cover border border-border-primary ${
                imageLoaded ? "block" : "hidden"
              }`}
              style={{ borderWidth: "0.9px" }}
            />
          </>
        ) : (
          <img
            className="default-avatar-auto bg-bg-tertiary w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] rounded-full object-cover border border-border-primary"
            style={{ borderWidth: "0.9px" }}
            alt={name}
          />
        )}
      </div>

      {isOwn && onEdit && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <button
            onClick={onEdit}
            className="t-btn accept px-6 py-2.5 text-[0.85rem]"
          >
            {tProfile("changeAvatar")}
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
