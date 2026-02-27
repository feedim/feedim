"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Calendar, CreditCard, RefreshCw, XCircle, Check, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

interface Subscription {
  id: number;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  cancelled_at: string | null;
  auto_renew: boolean;
  amount_paid: number;
  payment_method: string;
}

const planNames: Record<string, string> = {
  basic: "Super",
  super: "Super",
  pro: "Pro",
  max: "Max",
  business: "Business",
};

const planOrder = ["basic", "super", "pro", "max", "business"];

const statusColors: Record<string, string> = {
  active: "text-accent-main",
  cancelled: "text-warning",
  expired: "text-text-muted",
  suspended: "text-error",
};

export default function PremiumSettingsPage() {
  useSearchParams();
  const t = useTranslations("premium");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_premium, premium_plan, premium_until, coin_balance")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);

      // Load active subscription
      const { data: subData } = await supabase
        .from("premium_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setSubscription(subData || null);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    feedimAlert("question", t("cancelConfirm"), {
      showYesNo: true,
      onYes: async () => {
        if (!subscription) return;
        const minWait = new Promise(r => setTimeout(r, 2000));
        try {
          const { error } = await supabase
            .from("premium_subscriptions")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString(), auto_renew: false })
            .eq("id", subscription.id);

          await minWait;

          if (error) {
            feedimAlert("error", t("cancelFailed"));
            return;
          }

          setSubscription(prev => prev ? { ...prev, status: "cancelled", cancelled_at: new Date().toISOString(), auto_renew: false } : null);
          feedimAlert("success", t("cancelSuccess"));
        } catch {
          await minWait;
          feedimAlert("error", t("genericError"));
        }
      },
    });
  };

  const isPremium = profile?.is_premium;
  const currentPlan = profile?.premium_plan;
  const currentPlanIndex = currentPlan ? planOrder.indexOf(currentPlan) : -1;
  const canUpgrade = currentPlanIndex < planOrder.length - 1;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <AppLayout headerTitle={t("subscription")} hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : isPremium && subscription ? (
          <>
            {/* Plan Banner */}
            <div className={`mx-4 mt-3 p-5 rounded-[16px] ${getBadgeVariant(currentPlan) === "max" ? "bg-verified-max/[0.06]" : "bg-accent-main/[0.06]"}`}>
              <div className="flex items-center gap-3 mb-4">
                <VerifiedBadge size="lg" variant={getBadgeVariant(currentPlan)} className="!h-[28px] !w-[28px] !min-w-[28px]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[1.1rem] font-bold">Feedim {planNames[currentPlan] || currentPlan}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs font-semibold ${statusColors[subscription.status] || "text-text-muted"}`}>
                      {t(`status_${subscription.status}`)}
                    </span>
                    {subscription.status === "active" && (
                      <>
                        <span className="text-xs text-text-muted">{t("daysRemaining", { count: daysRemaining })}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-secondary rounded-[14px] p-3">
                  <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{t("startDate")}</p>
                  <p className="text-[0.82rem] font-semibold">{formatDate(subscription.started_at)}</p>
                </div>
                <div className="bg-bg-secondary rounded-[14px] p-3">
                  <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{t("endDate")}</p>
                  <p className="text-[0.82rem] font-semibold">{formatDate(subscription.expires_at)}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="mt-5">
              <h3 className="px-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("subscriptionDetails")}</h3>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">{t("amountPaid")}</span>
                </div>
                <span className="text-sm font-semibold">{Number(subscription.amount_paid).toLocaleString("tr-TR")}₺</span>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">{t("autoRenew")}</span>
                </div>
                <span className={`text-xs font-semibold ${subscription.auto_renew ? "text-accent-main" : "text-text-muted"}`}>
                  {subscription.auto_renew ? t("on") : t("off")}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">{t("remainingTime")}</span>
                </div>
                <span className="text-sm font-semibold">{t("daysCount", { count: daysRemaining })}</span>
              </div>

              {subscription.cancelled_at && (
                <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-warning" />
                    <span className="text-sm font-medium">{t("cancellationDate")}</span>
                  </div>
                  <span className="text-sm text-text-muted">{formatDate(subscription.cancelled_at)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5">
              <h3 className="px-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("actions")}</h3>

              {canUpgrade && (
                <Link
                  href="/premium"
                  className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-sm font-medium text-accent-main">{t("upgradePlan")}</span>
                      <p className="text-xs text-text-muted mt-0.5">{t("upgradeDesc")}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </Link>
              )}

              <Link
                href="/premium"
                className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">{t("viewAllPlans")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>

              {subscription.status === "active" && (
                <button
                  onClick={handleCancel}
                  className="flex items-center justify-between w-full px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-error" />
                    <div>
                      <span className="text-sm font-medium text-error">{t("cancelSubscription")}</span>
                      <p className="text-xs text-text-muted mt-0.5">{t("cancelSubDesc")}</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </>
        ) : isPremium && !subscription ? (
          <>
            <div className={`mx-4 mt-3 p-5 rounded-[16px] ${getBadgeVariant(currentPlan) === "max" ? "bg-verified-max/[0.06]" : "bg-accent-main/[0.06]"}`}>
              <div className="flex items-center gap-3 mb-4">
                <VerifiedBadge size="lg" variant={getBadgeVariant(currentPlan)} className="!h-[28px] !w-[28px] !min-w-[28px]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[1.1rem] font-bold">Feedim {planNames[currentPlan] || currentPlan}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-accent-main">{t("status_active")}</span>
                    {profile?.premium_until && (
                      <span className="text-xs text-text-muted">
                        {t("daysRemaining", { count: Math.max(0, Math.ceil((new Date(profile.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile?.premium_until && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-secondary rounded-[14px] p-3">
                    <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{t("endDate")}</p>
                    <p className="text-[0.82rem] font-semibold">{formatDate(profile.premium_until)}</p>
                  </div>
                  <div className="bg-bg-secondary rounded-[14px] p-3">
                    <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">{t("type")}</p>
                    <p className="text-[0.82rem] font-semibold">{t("gift")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <h3 className="px-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">{t("actions")}</h3>
              {canUpgrade && (
                <Link
                  href="/premium"
                  className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-sm font-medium text-accent-main">{t("upgradePlan")}</span>
                      <p className="text-xs text-text-muted mt-0.5">{t("upgradeDesc")}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted" />
                </Link>
              )}
              <Link
                href="/premium"
                className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">{t("viewAllPlans")}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </div>
          </>
        ) : (
          <div className="px-4 py-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <VerifiedBadge size="lg" className="!h-[33px] !w-[33px] !min-w-[33px]" />
              </div>
              <h2 className="text-[1.2rem] font-bold mb-2">{t("noSubscription")}</h2>
            </div>

            <div className="space-y-3 mb-8">
              {[
                t("benefit1"),
                t("benefit2"),
                t("benefit3"),
                t("benefit4"),
                t("benefit5"),
                t("benefit6"),
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-accent-main shrink-0" strokeWidth={2.5} />
                  <span className="text-sm text-text-muted">{text}</span>
                </div>
              ))}
            </div>

            <Link
              href="/premium"
              className="flex items-center justify-center w-full py-3.5 bg-bg-inverse text-bg-primary rounded-full font-semibold text-[0.93rem] hover:opacity-88 transition"
            >
              {t("viewPremiumPlans")}
            </Link>

            <p className="text-[0.8rem] text-text-muted leading-relaxed text-center mt-4 max-w-xs mx-auto">
              {t("premiumCta")}
            </p>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
