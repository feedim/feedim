"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import BackButton from "@/components/BackButton";
import { useHydrated } from "@/lib/useHydrated";

interface BoostPaymentData {
  postId: number;
  goal: string;
  daily_budget: number;
  duration_days: number;
  target_countries: string[];
  target_gender: string;
  age_min: number | null;
  age_max: number | null;
  total_budget: number;
}

export default function BoostPaymentPage() {
  useSearchParams();
  const t = useTranslations("payment");
  const tb = useTranslations("boost");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const hydrated = useHydrated();
  const router = useRouter();

  const data = useMemo(() => {
    if (!hydrated) return null;

    const raw = sessionStorage.getItem("fdm_boost_payment");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as BoostPaymentData;
      return parsed.postId && parsed.daily_budget ? parsed : null;
    } catch {
      return null;
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
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

  const subtotal = data.total_budget;
  const vatRate = 20;
  const vatAmount = Math.round(subtotal * vatRate / 100);
  const grandTotal = subtotal + vatAmount;

  return (
    <div className="min-h-screen text-text-primary">
      <header className="z-50">
        <nav className="container mx-auto px-4 flex items-center justify-between h-[53px] max-w-[520px]">
          <BackButton fallback="/" />
          <h1 className="text-[0.95rem] font-semibold">{tb("feedimAds")}</h1>
          <div className="w-8" />
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-24 max-w-[520px]">
        {/* Sipariş Özeti */}
        <div className="bg-bg-secondary rounded-2xl p-5 mb-6">
          <p className="text-[0.8rem] text-text-secondary font-bold uppercase tracking-wider mb-4">{tb("summary")}</p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{tb("goalTitle")}</span>
            <span className="text-[0.88rem] font-semibold">{tb(data.goal === 'likes' ? 'goalLikes' : data.goal === 'views' ? 'goalViews' : data.goal === 'comments' ? 'goalComments' : data.goal === 'profile_visits' ? 'goalProfileVisits' : 'goalReads')}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{tb("dailyBudget")}</span>
            <span className="text-[0.88rem] font-semibold">₺{data.daily_budget.toLocaleString(locale)}{tb("perDay")}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{tb("duration")}</span>
            <span className="text-[0.88rem] font-semibold">{tb("days", { count: data.duration_days })}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{tb("targeting")}</span>
            <span className="text-[0.88rem] font-medium text-text-primary">
              {data.target_countries.length > 0 ? data.target_countries.join(", ") : tb("allCountries")}
            </span>
          </div>

          <div className="h-px bg-border-primary/60 my-3" />

          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.88rem] text-text-muted">{tb("subtotal")}</span>
            <span className="text-[0.88rem] font-semibold">₺{subtotal.toLocaleString(locale)}</span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.88rem] text-text-muted">{tb("vat", { rate: vatRate })}</span>
            <span className="text-[0.88rem] font-semibold">₺{vatAmount.toLocaleString(locale)}</span>
          </div>

          <div className="h-px bg-border-primary/60 my-3" />

          <div className="flex items-center justify-between">
            <span className="text-[0.95rem] font-bold">{tb("totalCost")}</span>
            <span className="text-[1.1rem] font-bold">₺{grandTotal.toLocaleString(locale)}</span>
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
