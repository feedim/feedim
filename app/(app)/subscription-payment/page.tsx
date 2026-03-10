"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import { Loader2, Check, Tag, Shield, Sparkles, BarChart3, Eye, AlertCircle } from "lucide-react";
import BackButton from "@/components/BackButton";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useUser } from "@/components/UserContext";
import { useTranslations, useLocale } from "next-intl";
import { useHydrated } from "@/lib/useHydrated";

interface PremiumPaymentData {
  plan_id: string;
  plan_name: string;
  price: number;
  period: string;
  billing: "monthly" | "yearly";
}

interface ProrationInfo {
  has_active: boolean;
  current_plan?: string;
  credit: number;
  remaining_days: number;
  original_price: number;
  final_price: number;
}

const planFeatureKeys: Record<string, { icon: typeof Check; key: string }[]> = {
  basic: [
    { icon: Check, key: "featureNoAds" },
    { icon: Check, key: "featureIncreasedLimits" },
  ],
  pro: [
    { icon: Check, key: "featureVerifiedBadge" },
    { icon: Check, key: "featureNoAds" },
    { icon: Sparkles, key: "featureFeaturedExplore" },
    { icon: BarChart3, key: "featureAnalytics" },
    { icon: Shield, key: "featureMfa" },
  ],
  max: [
    { icon: Check, key: "featureGoldenBadge" },
    { icon: Check, key: "featureNoAds" },
    { icon: Sparkles, key: "featureFeaturedExplore" },
    { icon: BarChart3, key: "featureAnalytics" },
    { icon: Eye, key: "featureProfileVisitors" },
    { icon: Check, key: "featureLongPost" },
    { icon: Check, key: "featureLongComment" },
  ],
  business: [
    { icon: Check, key: "featureGoldenBadge" },
    { icon: Check, key: "featureNoAds" },
    { icon: Sparkles, key: "featureFeaturedExplore" },
    { icon: BarChart3, key: "featureAnalytics" },
    { icon: Eye, key: "featureProfileVisitors" },
    { icon: Check, key: "featureLongPost" },
    { icon: Check, key: "featureLongComment" },
    { icon: Check, key: "featureBusinessAccount" },
    { icon: Shield, key: "featurePrioritySupport" },
  ],
};

const planNames: Record<string, string> = {
  basic: "Super",
  pro: "Pro",
  max: "Max",
  business: "Business",
};

export default function SubscriptionPaymentPage() {
  useSearchParams();
  const t = useTranslations("payment");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const hydrated = useHydrated();
  const [proration, setProration] = useState<ProrationInfo | null>(null);
  const [prorationLoading, setProrationLoading] = useState(false);
  const router = useRouter();
  const { user: currentUser } = useUser();
  const userCurrentPlan = currentUser?.premiumPlan || null;

  const data = useMemo(() => {
    if (!hydrated) return null;

    const raw = sessionStorage.getItem("fdm_premium");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as PremiumPaymentData;
      return parsed.plan_id ? parsed : null;
    } catch {
      return null;
    }
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (data) {
      fetchProration(data.plan_id);
      return;
    }
    emitNavigationStart();
    router.push("/premium");
  }, [data, hydrated, router]);

  const fetchProration = async (planId: string) => {
    setProrationLoading(true);
    try {
      const res = await fetch(`/api/payment/proration?plan_id=${planId}`);
      if (res.ok) {
        const info = await res.json();
        setProration(info);
      }
    } catch {} finally {
      setProrationLoading(false);
    }
  };

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

  const isCurrentPlan = userCurrentPlan === data.plan_id || (proration?.has_active && proration?.current_plan === data.plan_id);
  const hasDiscount = proration && proration.has_active && proration.credit > 0 && !isCurrentPlan;
  const featureKeyList = planFeatureKeys[data.plan_id] || planFeatureKeys.pro;
  const isUpgrade = hasDiscount;

  return (
    <div className="min-h-screen text-text-primary">
      {/* Header */}
      <header className="z-50 border-b border-border-primary/50">
        <nav className="container mx-auto px-3 flex items-center justify-between h-[53px] max-w-[520px]">
          <BackButton fallback="/premium" />
          <h1 className="text-[0.95rem] font-semibold">{isUpgrade ? t("upgradePlan") : t("subscription")}</h1>
          <div className="w-8" />
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-24 max-w-[520px]">
        {/* Plan Hero */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <VerifiedBadge size="lg" variant={getBadgeVariant(data.plan_id)} className="!h-[44px] !w-[44px] !min-w-[44px]" />
          </div>
          <h2 className="text-[1.3rem] font-bold mb-1">Feedim {planNames[data.plan_id] || data.plan_name}</h2>
          <p className="text-sm text-text-muted">
            {isUpgrade ? t("upgradingFromCurrent") : t("readyForPremium")}
          </p>
        </div>

        {/* Features */}
        <div className="rounded-2xl bg-bg-secondary p-5 mb-5">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-4">{t("includedFeatures")}</p>
          <div className="space-y-3">
            {featureKeyList.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="h-[15px] w-[15px] text-accent-main shrink-0" strokeWidth={2.5} />
                <span className="text-[0.88rem] font-medium">{t(f.key)}</span>
              </div>
            ))}
          </div>
          <Link href="/premium" className="block mt-4 text-[0.78rem] font-semibold text-accent-main hover:text-accent-main/80 transition">
            {t("seeAllFeatures")} →
          </Link>
        </div>

        {/* Pricing Card */}
        <div className="rounded-2xl bg-bg-secondary p-5 mb-5">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-4">{t("paymentSummary")}</p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{t("plan")}</span>
            <span className="text-[0.88rem] font-semibold">Premium {data.plan_name}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">{t("period")}</span>
            <span className="text-[0.88rem] font-semibold">{data.billing === "yearly" ? t("yearly") : t("monthly")}</span>
          </div>

          {!hasDiscount && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.88rem] text-text-muted">{t("amount")}</span>
              <span className="text-[0.88rem] font-semibold">{data.price.toLocaleString(locale)}₺/{data.period}</span>
            </div>
          )}

          {/* Proration loading */}
          {prorationLoading && (
            <div className="flex items-center gap-2 text-xs text-text-muted mt-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("calculatingDiscount")}
            </div>
          )}

          {/* Proration discount */}
          {hasDiscount && (
            <>
              <div className="h-px bg-border-primary/60 my-3" />

              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.88rem] text-text-muted">{t("originalPrice")}</span>
                <span className="text-[0.88rem] text-text-muted line-through">{proration.original_price.toLocaleString(locale)}₺</span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-accent-main" />
                  <span className="text-[0.88rem] text-accent-main font-medium">{t("remainingDaysDiscount")}</span>
                </div>
                <span className="text-[0.88rem] text-accent-main font-semibold">-{proration.credit.toLocaleString(locale)}₺</span>
              </div>

              <div className="h-px bg-border-primary/60 my-3" />

              <div className="flex items-center justify-between">
                <span className="text-[0.95rem] font-bold">{t("total")}</span>
                <span className="text-[1.1rem] font-bold">{proration.final_price.toLocaleString(locale)}₺</span>
              </div>

              <div className="mt-3 rounded-xl bg-accent-main/[0.06] px-4 py-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  {t("prorationInfo", { days: proration.remaining_days, credit: proration.credit.toLocaleString(locale) })}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Beta Notice */}
        <div className="rounded-2xl border border-accent-main/20 bg-accent-main/5 p-5 mb-5 text-center">
          <AlertCircle className="h-8 w-8 text-accent-main mx-auto mb-3" />
          <p className="text-[0.95rem] font-semibold mb-1">{tCommon("betaNotice")}</p>
          <p className="text-sm text-text-muted">{tCommon("betaPaymentDesc")}</p>
        </div>

        {isCurrentPlan ? (
          <button disabled className="premium-cta-btn w-full !opacity-60 !cursor-not-allowed">
            {t("currentPlan")}
          </button>
        ) : (
          <button disabled className="premium-cta-btn w-full !opacity-60 !cursor-not-allowed">
            {tCommon("betaNotice")}
          </button>
        )}

        <p className="text-center text-[0.72rem] text-text-muted mt-2.5">
          {t("cancelAnytime")}
        </p>

        {/* Footer */}
        <div className="mt-10 space-y-2 text-center">
          <div className="mt-6 bg-bg-secondary rounded-[15px] px-4 py-3 space-y-1.5 text-xs text-text-muted font-medium">
            <p>{t("sslSecure")}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
