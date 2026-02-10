"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

/* ─── Bottom Sheet (standalone, controlled) ─── */
/* All spacing uses inline styles to resist template CSS resets (e.g. * { padding: 0 }) */

interface ShareSheetProps {
  url: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareSheet({ url, title = "", isOpen, onClose }: ShareSheetProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(!!navigator.share);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`, "_blank");
    onClose();
  };

  const handleX = () => {
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, "_blank");
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelled */ }
    }
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.cssText = "position:fixed;left:-9999px;top:-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast.success("Link kopyalandi!");
    } catch {
      toast.error("Kopyalama basarisiz");
    }
    onClose();
  };

  if (!isOpen) return null;

  const optionBtnStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    padding: 8,
    borderRadius: 16,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "background 0.15s, transform 0.1s",
  };

  const iconCircleBase: React.CSSProperties = {
    width: 56,
    height: 56,
    borderRadius: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 500,
          background: "#18181b",
          borderRadius: "32px 32px 0 0",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "slideUp 0.25s ease-out",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 12,
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Paylas</h3>
            <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{title || url}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 9999,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#9ca3af",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Share Options */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {/* WhatsApp */}
          <button onClick={handleWhatsApp} style={optionBtnStyle} aria-label="WhatsApp ile paylaş">
            <div style={{ ...iconCircleBase, background: "#25D366" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0 }}>WhatsApp</span>
          </button>

          {/* X */}
          <button onClick={handleX} style={optionBtnStyle} aria-label="X ile paylaş">
            <div style={{ ...iconCircleBase, background: "rgba(255,255,255,0.1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0 }}>X</span>
          </button>

          {/* Native Share */}
          {canNativeShare && (
            <button onClick={handleNativeShare} style={optionBtnStyle} aria-label="Diğer uygulamalarla paylaş">
              <div style={{ ...iconCircleBase, background: "lab(49.5493 79.8381 2.31768)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0 }}>Diger</span>
            </button>
          )}

          {/* Copy Link */}
          <button onClick={handleCopyLink} style={optionBtnStyle} aria-label="Linki kopyala">
            <div style={{ ...iconCircleBase, background: "rgba(255,255,255,0.1)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0 }}>Kopyala</span>
          </button>
        </div>

        {/* URL preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            borderRadius: 12,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{url}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Button + Sheet (self-contained) ─── */

interface ShareIconButtonProps {
  url: string;
  title?: string;
  variant?: "glass" | "ghost" | "fixed";
  size?: number;
  className?: string;
}

export default function ShareIconButton({
  url,
  title = "",
  variant = "ghost",
  size = 18,
  className = "",
}: ShareIconButtonProps) {
  const [open, setOpen] = useState(false);

  const glassStyle: React.CSSProperties = {
    width: 44,
    height: 44,
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  const btnClass =
    variant === "ghost"
      ? "p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
      : "rounded-full flex items-center justify-center transition-all duration-200 active:scale-95";

  const btnStyle: React.CSSProperties =
    variant === "fixed"
      ? { ...glassStyle, position: "fixed", top: 16, right: 16, zIndex: 9998 }
      : variant === "glass"
        ? glassStyle
        : {};

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }}
        className={`${btnClass} ${className}`}
        style={btnStyle}
        aria-label="Paylas"
      >
        <ShareIcon size={size} />
      </button>
      <ShareSheet url={url} title={title} isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ShareIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
