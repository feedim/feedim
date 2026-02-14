"use client";

import { useEffect, useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";

const PROMO_STORAGE_KEY = "forilove_pending_promo";
const PROMO_INFO_KEY = "forilove_promo_info";

export default function PromoBanner() {
  const [promoInfo, setPromoInfo] = useState<{ code: string; discount: number } | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const init = async () => {
      // Don't show on dashboard (promo already applied after signup)
      if (pathname?.startsWith("/dashboard")) {
        setPromoInfo(null);
        return;
      }

      // 1. Check URL for ?promo=CODE
      const urlPromo = searchParams.get("promo");
      if (urlPromo && /^[a-zA-Z0-9]{3,20}$/.test(urlPromo)) {
        const normalizedCode = urlPromo.toUpperCase();
        localStorage.setItem(PROMO_STORAGE_KEY, normalizedCode);
        try {
          const res = await fetch(`/api/promo/check?code=${normalizedCode}`);
          const data = await res.json();
          if (data.valid) {
            const info = { code: normalizedCode, discount: data.discount_percent };
            localStorage.setItem(PROMO_INFO_KEY, JSON.stringify(info));
            setPromoInfo(info);
          } else {
            localStorage.removeItem(PROMO_STORAGE_KEY);
            localStorage.removeItem(PROMO_INFO_KEY);
            setPromoInfo(null);
          }
        } catch {
          // Network error - keep the code, just don't show banner
        }
        return;
      }

      // 2. No URL param - check localStorage
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

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center" style={{ height: 30, background: 'lab(49.5493% 79.8381 2.31768)' }}>
      <span className="text-white" style={{ fontSize: 11, fontWeight: 600 }}>
        %{promoInfo.discount} indirim uygulandı — Kod: {promoInfo.code}
      </span>
    </div>
  );
}
