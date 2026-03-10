"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import BackButton from "@/components/BackButton";
import { useHydrated } from "@/lib/useHydrated";

interface CoinPaymentData {
  amount_try: number;
  base_coins: number;
  bonus_coins: number;
  total_coins: number;
}

export default function PaymentPage() {
  useSearchParams();
  const t = useTranslations("payment");
  const tc = useTranslations("coins");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const hydrated = useHydrated();
  const router = useRouter();

  const data = useMemo(() => {
    if (!hydrated) return null;

    const premiumRaw = sessionStorage.getItem("fdm_premium");
    if (premiumRaw) return null;

    const coinRaw = sessionStorage.getItem("fdm_payment");
    if (!coinRaw) return null;

    try {
      const parsed = JSON.parse(coinRaw) as CoinPaymentData;
      return parsed.amount_try ? parsed : null;
    } catch {
      return null;
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    if (sessionStorage.getItem("fdm_premium")) {
      router.replace("/subscription-payment");
      return;
    }

    if (!data) {
      router.push("/");
    }
  }, [data, hydrated, router]);

  if (!hydrated || !data) {
    return (
      <div className="min-h-screen text-text-primary">
        <div className="h-[53px]" />
        <div className="container mx-auto px-4 pt-6 pb-24 max-w-[520px] space-y-6">
          <div className="bg-bg-secondary rounded-2xl p-5 space-y-4">
            <div className="h-[9px] w-32 bg-bg-tertiary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-full bg-bg-tertiary rounded-[5px] animate-pulse" />
            <div className="h-[9px] w-[70%] bg-bg-tertiary rounded-[5px] animate-pulse" />
            <div className="h-px bg-border-primary/30" />
            <div className="h-[9px] w-[50%] bg-bg-tertiary rounded-[5px] animate-pulse" />
          </div>
          <div className="h-12 w-full bg-bg-secondary rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const totalCoins = data.total_coins;

  return (
    <div className="min-h-screen text-text-primary">
      <header className="z-50">
        <nav className="container mx-auto px-3 flex items-center justify-between h-[53px] max-w-[520px]">
          <div className="flex items-center gap-2">
            <BackButton fallback="/" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_band_white.svg" alt="Feedim" className="footer-logo" />
          </div>
          <h1 className="text-[0.95rem] font-semibold">{t("paymentTitle")}</h1>
          <div className="w-8" />
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-24 max-w-[520px]">
        {/* Sipariş Özeti */}
        <div className="bg-bg-secondary rounded-2xl p-5 mb-6">
          <p className="text-[0.8rem] text-text-secondary font-bold uppercase tracking-wider mb-4">{t("paymentSummary")}</p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{tc("baseTokens")}</span>
            <span className="text-[0.88rem] font-semibold">{data.base_coins.toLocaleString(locale)} {tc("token")}</span>
          </div>

          {data.bonus_coins > 0 && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.88rem] text-accent-main font-medium">{tc("bonus", { percent: data.base_coins > 0 ? Math.round((data.bonus_coins / data.base_coins) * 100) : 0 })}</span>
              <span className="text-[0.88rem] font-semibold text-accent-main">+{data.bonus_coins.toLocaleString(locale)} {tc("token")}</span>
            </div>
          )}

          <div className="h-px bg-border-primary/60 my-3" />

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] font-bold">{tc("totalTokens")}</span>
            <span className="text-[0.88rem] font-bold text-accent-main">{totalCoins.toLocaleString(locale)} {tc("token")}</span>
          </div>

          <div className="h-px bg-border-primary/60 my-3" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.88rem] text-text-muted">{t("subtotal")}</span>
            <span className="text-[0.88rem] text-text-muted">₺{(data.amount_try / 1.20).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{t("taxIncluded", { rate: 20 })}</span>
            <span className="text-[0.88rem] text-text-muted">₺{(data.amount_try - data.amount_try / 1.20).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[0.95rem] font-bold">{t("total")}</span>
            <span className="text-[1.1rem] font-bold">₺{data.amount_try.toLocaleString(locale)}</span>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="rounded-2xl border border-accent-main/20 bg-accent-main/5 p-5 mb-6 text-center">
          <AlertCircle className="h-8 w-8 text-accent-main mx-auto mb-3" />
          <p className="text-[0.95rem] font-semibold mb-1">{tCommon("betaNotice")}</p>
          <p className="text-sm text-text-muted">{tCommon("betaPaymentDesc")}</p>
        </div>

        <button disabled className="t-btn accept w-full !opacity-60 !cursor-not-allowed">
          {tCommon("betaNotice")}
        </button>

        {/* Info & Legal */}
        <div className="mt-6 bg-bg-secondary rounded-[15px] px-4 py-3 space-y-1.5 text-xs text-text-muted font-medium">
          <p>{t("sslSecure")}</p>
        </div>
      </main>
    </div>
  );
}
