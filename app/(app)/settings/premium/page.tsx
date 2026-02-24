"use client";

import { useState, useEffect } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Calendar, CreditCard, RefreshCw, XCircle, Check, ChevronRight } from "lucide-react";
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

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Aktif", color: "text-accent-main" },
  cancelled: { label: "İptal Edildi", color: "text-warning" },
  expired: { label: "Süresi Doldu", color: "text-text-muted" },
  suspended: { label: "Askıya Alındı", color: "text-error" },
};

export default function PremiumSettingsPage() {
  useSearchParams();
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
    feedimAlert("question", "Premium aboneliğinizi iptal etmek istediğinize emin misiniz? Mevcut dönem sonuna kadar premium özelliklerden yararlanmaya devam edersiniz.", {
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
            feedimAlert("error", "İptal işlemi başarısız oldu, lütfen daha sonra tekrar deneyin");
            return;
          }

          setSubscription(prev => prev ? { ...prev, status: "cancelled", cancelled_at: new Date().toISOString(), auto_renew: false } : null);
          feedimAlert("success", "Aboneliğiniz iptal edildi. Dönem sonuna kadar premium özellikler aktif kalacak");
        } catch {
          await minWait;
          feedimAlert("error", "Bir hata oluştu, lütfen daha sonra tekrar deneyin");
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
    <AppLayout headerTitle="Abonelik" hideRightSidebar>
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
                    <span className={`text-xs font-semibold ${statusLabels[subscription.status]?.color || "text-text-muted"}`}>
                      {statusLabels[subscription.status]?.label || subscription.status}
                    </span>
                    {subscription.status === "active" && (
                      <>
                        <span className="text-xs text-text-muted">{daysRemaining} gün kaldı</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-secondary rounded-[14px] p-3">
                  <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">Başlangıç</p>
                  <p className="text-[0.82rem] font-semibold">{formatDate(subscription.started_at)}</p>
                </div>
                <div className="bg-bg-secondary rounded-[14px] p-3">
                  <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">Bitiş</p>
                  <p className="text-[0.82rem] font-semibold">{formatDate(subscription.expires_at)}</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="mt-5">
              <h3 className="px-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Abonelik Detayları</h3>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">Ödenen Tutar</span>
                </div>
                <span className="text-sm font-semibold">{Number(subscription.amount_paid).toLocaleString("tr-TR")}₺</span>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">Otomatik Yenileme</span>
                </div>
                <span className={`text-xs font-semibold ${subscription.auto_renew ? "text-accent-main" : "text-text-muted"}`}>
                  {subscription.auto_renew ? "Açık" : "Kapalı"}
                </span>
              </div>

              <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-text-muted" />
                  <span className="text-sm font-medium">Kalan Süre</span>
                </div>
                <span className="text-sm font-semibold">{daysRemaining} gün</span>
              </div>

              {subscription.cancelled_at && (
                <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px]">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-warning" />
                    <span className="text-sm font-medium">İptal Tarihi</span>
                  </div>
                  <span className="text-sm text-text-muted">{formatDate(subscription.cancelled_at)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-5">
              <h3 className="px-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">İşlemler</h3>

              {canUpgrade && (
                <Link
                  href="/premium"
                  className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-sm font-medium text-accent-main">Planı Yükselt</span>
                      <p className="text-xs text-text-muted mt-0.5">Daha fazla özellik ve daha yüksek limitler</p>
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
                  <span className="text-sm font-medium">Tüm Planları Gör</span>
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
                      <span className="text-sm font-medium text-error">Aboneliği İptal Et</span>
                      <p className="text-xs text-text-muted mt-0.5">Dönem sonuna kadar aktif kalır</p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </>
        ) : isPremium && !subscription ? (
          /* Admin tarafından hediye edilen premium — subscription kaydı yok */
          <>
            <div className={`mx-4 mt-3 p-5 rounded-[16px] ${getBadgeVariant(currentPlan) === "max" ? "bg-verified-max/[0.06]" : "bg-accent-main/[0.06]"}`}>
              <div className="flex items-center gap-3 mb-4">
                <VerifiedBadge size="lg" variant={getBadgeVariant(currentPlan)} className="!h-[28px] !w-[28px] !min-w-[28px]" />
                <div className="flex-1 min-w-0">
                  <p className="text-[1.1rem] font-bold">Feedim {planNames[currentPlan] || currentPlan}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-semibold text-accent-main">Aktif</span>
                    {profile?.premium_until && (
                      <span className="text-xs text-text-muted">
                        {Math.max(0, Math.ceil((new Date(profile.premium_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} gün kaldı
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile?.premium_until && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-secondary rounded-[14px] p-3">
                    <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">Bitiş</p>
                    <p className="text-[0.82rem] font-semibold">{formatDate(profile.premium_until)}</p>
                  </div>
                  <div className="bg-bg-secondary rounded-[14px] p-3">
                    <p className="text-[0.65rem] text-text-muted uppercase tracking-wider mb-1">Tür</p>
                    <p className="text-[0.82rem] font-semibold">Hediye</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <h3 className="px-4 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">İşlemler</h3>
              {canUpgrade && (
                <Link
                  href="/premium"
                  className="flex items-center justify-between px-4 py-3.5 rounded-[13px] hover:bg-bg-tertiary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="h-5 w-5 text-accent-main" />
                    <div>
                      <span className="text-sm font-medium text-accent-main">Planı Yükselt</span>
                      <p className="text-xs text-text-muted mt-0.5">Daha fazla özellik ve daha yüksek limitler</p>
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
                  <span className="text-sm font-medium">Tüm Planları Gör</span>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </div>
          </>
        ) : (
          /* Premium değil — upgrade CTA */
          <div className="px-4 py-8">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <VerifiedBadge size="lg" className="!h-[33px] !w-[33px] !min-w-[33px]" />
              </div>
              <h2 className="text-[1.2rem] font-bold mb-2">Henüz bir aboneliğin yok</h2>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "Onaylı rozet ile güvenilirliğini göster",
                "Reklamsız, kesintisiz içerik deneyimi",
                "İçeriklerinle Jeton kazan, nakde çevir",
                "Keşfette ve aramalarda öne çık",
                "Analitik paneli ile istatistiklerini takip et",
                "Dim mod ile göz yormayan okuma deneyimi",
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
              Premium Planları Gör
            </Link>

            <p className="text-[0.8rem] text-text-muted leading-relaxed text-center mt-4 max-w-xs mx-auto">
              Premium'a geçerek onaylı rozet, reklamsız deneyim, analitik paneli ve daha birçok özelliğe eriş.
            </p>
          </div>
        )}

        {/* Alt bilgiler */}
        <div className="mt-10 mb-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <p>Tüm işlemler güvenli şekilde yapılır.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center text-[0.72rem] text-text-muted font-medium pt-2">
            <Link href="/terms" className="hover:text-text-primary transition">Koşullar</Link>
            <Link href="/privacy" className="hover:text-text-primary transition">Gizlilik</Link>
            <Link href="/help" className="hover:text-text-primary transition">Yardım Merkezi</Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
