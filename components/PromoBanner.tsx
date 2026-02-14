"use client";

import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PROMO_STORAGE_KEY = "forilove_pending_promo";
const PROMO_INFO_KEY = "forilove_promo_info";
const PROMO_DISMISSED_KEY = "forilove_promo_dismissed";

export default function PromoBanner() {
  const [promoInfo, setPromoInfo] = useState<{ code: string; discount: number } | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      // 1. ALWAYS capture ?promo=CODE from URL first (works for both logged-in and guest users)
      const urlPromo = searchParams.get("promo");
      if (urlPromo && /^[a-zA-Z0-9]{3,20}$/.test(urlPromo)) {
        const normalizedCode = urlPromo.toUpperCase();
        localStorage.setItem(PROMO_STORAGE_KEY, normalizedCode);
        try {
          const res = await fetch(`/api/promo/check?code=${normalizedCode}`);
          const data = await res.json();
          if (data.valid) {
            localStorage.setItem(PROMO_INFO_KEY, JSON.stringify({ code: normalizedCode, discount: data.discount_percent }));
          } else {
            localStorage.removeItem(PROMO_STORAGE_KEY);
            localStorage.removeItem(PROMO_INFO_KEY);
          }
        } catch {
          // Network error - keep the code stored
        }
      }

      // Don't show banner on dashboard, editor, or preview pages
      if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/editor") || pathname?.startsWith("/preview")) {
        setPromoInfo(null);
        return;
      }

      // Banner only for guests — logged-in users get auto-apply via PurchaseConfirmModal
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        localStorage.removeItem(PROMO_INFO_KEY);
        setPromoInfo(null);
        return;
      }

      // Check if banner was dismissed within last 5 minutes
      const dismissedAt = localStorage.getItem(PROMO_DISMISSED_KEY);
      if (dismissedAt && Date.now() - parseInt(dismissedAt) < 5 * 60 * 1000) {
        setPromoInfo(null);
        return;
      }

      // Show banner from localStorage
      const stored = localStorage.getItem(PROMO_INFO_KEY);
      if (stored) {
        try {
          const info = JSON.parse(stored);
          if (info.code && info.discount) {
            setPromoInfo(info);
          }
        } catch {
          localStorage.removeItem(PROMO_INFO_KEY);
        }
      } else {
        setPromoInfo(null);
      }
    };
    init();
  }, [searchParams, pathname]);

  // Listen for promo cleared event (from dashboard after signup)
  useEffect(() => {
    const handleCleared = () => setPromoInfo(null);
    window.addEventListener("promo-cleared", handleCleared);
    return () => window.removeEventListener("promo-cleared", handleCleared);
  }, []);

  if (!promoInfo) return null;

  const handleDismiss = () => {
    localStorage.setItem(PROMO_DISMISSED_KEY, Date.now().toString());
    setPromoInfo(null);
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center" style={{ height: 30, background: 'lab(49.5493% 79.8381 2.31768)' }}>
      <span className="text-white" style={{ fontSize: 11, fontWeight: 600 }}>
        %{promoInfo.discount} indirim uygulandı — Kod: {promoInfo.code}
      </span>
      <button
        onClick={handleDismiss}
        className="absolute right-2 flex items-center justify-center"
        style={{ width: 20, height: 20 }}
        aria-label="Kapat"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  );
}
