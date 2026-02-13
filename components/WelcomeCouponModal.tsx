"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface WelcomeCouponModalProps {
  code: string;
  discountPercent: number;
  expiresAt: string | null;
  onClose: () => void;
}

export default function WelcomeCouponModal({ code, discountPercent, expiresAt, onClose }: WelcomeCouponModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999999] flex items-end justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] bg-zinc-900 rounded-t-[32px] p-6 flex flex-col items-center gap-5 animate-[slideUp_0.25s_ease-out]"
      >
        {/* Gift Icon */}
        <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
            <rect x="3" y="8" width="18" height="4" rx="1" />
            <path d="M12 8v13" />
            <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
            <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
          </svg>
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-1">Hos geldiniz!</h3>
          <p className="text-sm text-gray-400">
            Size ozel %{discountPercent} indirim kuponu hediye ettik.
          </p>
        </div>

        {/* Coupon Code */}
        <div className="w-full bg-white/5 border border-dashed border-yellow-500/40 rounded-xl p-4 flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-yellow-500 tracking-wider">{code}</span>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-yellow-500 text-black text-sm font-semibold rounded-lg hover:bg-yellow-400 transition shrink-0"
          >
            {copied ? "Kopyalandi!" : "Kopyala"}
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center">
          {daysLeft !== null ? `${daysLeft} gun gecerli` : "Sureli kupon"} · Sablon satin aliminda gecerli · 1 kullanim
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn-primary w-full"
        >
          Anladim
        </button>
      </div>
    </div>,
    document.body
  );
}
