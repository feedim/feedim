"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, AlertCircle, Check, Tag, Shield, Sparkles, BarChart3, Eye } from "lucide-react";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import { useUser } from "@/components/UserContext";

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

const planFeatures: Record<string, { icon: typeof Check; text: string }[]> = {
  basic: [
    { icon: Check, text: "Reklamsız deneyim" },
    { icon: Check, text: "Artırılmış günlük limitler" },
  ],
  pro: [
    { icon: Check, text: "Onaylı rozet" },
    { icon: Check, text: "Reklamsız deneyim" },
    { icon: Sparkles, text: "Keşfet ve aramalarda öne çıkma" },
    { icon: BarChart3, text: "Analitik paneli" },
    { icon: Shield, text: "İki faktörlü doğrulama" },
  ],
  max: [
    { icon: Check, text: "Onaylı rozet (altın)" },
    { icon: Check, text: "Reklamsız deneyim" },
    { icon: Sparkles, text: "Keşfet ve aramalarda öne çıkma" },
    { icon: BarChart3, text: "Analitik paneli" },
    { icon: Eye, text: "Profil ziyaretçileri" },
    { icon: Check, text: "Uzun gönderi (15.000 kelime)" },
    { icon: Check, text: "Uzun yorum (500 karakter)" },
    { icon: Shield, text: "Öncelikli destek" },
  ],
  business: [
    { icon: Check, text: "Onaylı rozet (altın)" },
    { icon: Check, text: "Reklamsız deneyim" },
    { icon: Sparkles, text: "Keşfet ve aramalarda öne çıkma" },
    { icon: BarChart3, text: "Analitik paneli" },
    { icon: Eye, text: "Profil ziyaretçileri" },
    { icon: Check, text: "Uzun gönderi (15.000 kelime)" },
    { icon: Check, text: "Uzun yorum (500 karakter)" },
    { icon: Check, text: "İşletme hesabı" },
    { icon: Shield, text: "Öncelikli destek" },
  ],
};

const planNames: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  max: "Max",
  business: "Business",
};

export default function SubscriptionPaymentPage() {
  const [data, setData] = useState<PremiumPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [proration, setProration] = useState<ProrationInfo | null>(null);
  const [prorationLoading, setProrationLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { user: currentUser } = useUser();
  const userCurrentPlan = currentUser?.premiumPlan || null;

  useEffect(() => {
    const raw = sessionStorage.getItem("fdm_premium");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.plan_id) {
          setData(parsed as PremiumPaymentData);
          setLoading(false);
          fetchProration(parsed.plan_id);
          return;
        }
      } catch {}
    }
    router.push("/premium");
  }, [router]);

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

  const handlePurchase = async () => {
    if (!data || processing) return;
    setProcessing(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        feedimAlert("error", "Giriş yapılmadı");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/payment/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "premium", plan_id: data.plan_id }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || "İşlem başarısız, lütfen daha sonra tekrar deneyin");
        return;
      }

      sessionStorage.removeItem("fdm_premium");
      sessionStorage.setItem("fdm_welcome_premium", JSON.stringify({
        plan_name: result.plan_name,
        plan_id: data.plan_id,
      }));
      router.push("/dashboard");
    } catch (err: any) {
      setError("Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-accent-main animate-spin" />
      </div>
    );
  }

  const isCurrentPlan = userCurrentPlan === data.plan_id || (proration?.has_active && proration?.current_plan === data.plan_id);
  const hasDiscount = proration && proration.has_active && proration.credit > 0 && !isCurrentPlan;
  const displayPrice = hasDiscount ? proration.final_price : data.price;
  const features = planFeatures[data.plan_id] || planFeatures.pro;
  const isUpgrade = hasDiscount;

  return (
    <div className="min-h-screen text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg-primary sticky-ambient border-b border-border-primary/50">
        <nav className="container mx-auto px-4 flex items-center justify-between h-[53px] max-w-[520px]">
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/premium"); }}
            className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[0.95rem] font-semibold">{isUpgrade ? "Planı Yükselt" : "Abonelik"}</h1>
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
            {isUpgrade ? "Mevcut planından yükseltme yapıyorsun" : "Premium özelliklere erişmeye hazırsın"}
          </p>
        </div>

        {/* Features */}
        <div className="rounded-2xl bg-bg-secondary p-5 mb-5">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-4">Dahil Olan Özellikler</p>
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <f.icon className="h-[15px] w-[15px] text-accent-main shrink-0" strokeWidth={2.5} />
                <span className="text-[0.88rem] font-medium">{f.text}</span>
              </div>
            ))}
          </div>
          <Link href="/premium" className="block mt-4 text-[0.78rem] font-semibold text-accent-main hover:text-accent-main/80 transition">
            Tüm özellikleri gör →
          </Link>
        </div>

        {/* Pricing Card */}
        <div className="rounded-2xl bg-bg-secondary p-5 mb-5">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-4">Ödeme Özeti</p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">Plan</span>
            <span className="text-[0.88rem] font-semibold">Premium {data.plan_name}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.88rem] text-text-muted">Dönem</span>
            <span className="text-[0.88rem] font-semibold">{data.billing === "yearly" ? "Yıllık" : "Aylık"}</span>
          </div>

          {!hasDiscount && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.88rem] text-text-muted">Tutar</span>
              <span className="text-[0.88rem] font-semibold">{data.price.toLocaleString("tr-TR")}₺/{data.period}</span>
            </div>
          )}

          {/* Proration loading */}
          {prorationLoading && (
            <div className="flex items-center gap-2 text-xs text-text-muted mt-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              İndirim hesaplanıyor...
            </div>
          )}

          {/* Proration discount */}
          {hasDiscount && (
            <>
              <div className="h-px bg-border-primary/60 my-3" />

              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.88rem] text-text-muted">Orijinal fiyat</span>
                <span className="text-[0.88rem] text-text-muted line-through">{proration.original_price.toLocaleString("tr-TR")}₺</span>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-accent-main" />
                  <span className="text-[0.88rem] text-accent-main font-medium">Kalan gün indirimi</span>
                </div>
                <span className="text-[0.88rem] text-accent-main font-semibold">-{proration.credit.toLocaleString("tr-TR")}₺</span>
              </div>

              <div className="h-px bg-border-primary/60 my-3" />

              <div className="flex items-center justify-between">
                <span className="text-[0.95rem] font-bold">Toplam</span>
                <span className="text-[1.1rem] font-bold">{proration.final_price.toLocaleString("tr-TR")}₺</span>
              </div>

              <div className="mt-3 rounded-xl bg-accent-main/[0.06] px-4 py-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  Mevcut planından kalan <span className="font-semibold text-text-primary">{proration.remaining_days} gün</span> için
                  {" "}<span className="font-semibold text-accent-main">{proration.credit.toLocaleString("tr-TR")}₺</span> indirim uygulandı.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-error/20 bg-error/5 p-4 mb-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-error mt-0.5 shrink-0" />
              <div>
                <p className="text-error font-medium text-sm mb-1">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="text-xs text-error underline hover:text-error/80 transition"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {isCurrentPlan ? (
          <button disabled className="premium-cta-btn w-full !opacity-60 !cursor-not-allowed">
            Mevcut Plan
          </button>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={processing || prorationLoading}
            className="premium-cta-btn w-full disabled:opacity-50"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                İşleniyor...
              </span>
            ) : isUpgrade ? (
              `${data.plan_name} Planına Yükselt — ${displayPrice!.toLocaleString("tr-TR")}₺`
            ) : (
              `${data.plan_name} ile Başla — ${displayPrice!.toLocaleString("tr-TR")}₺/${data.period}`
            )}
          </button>
        )}

        <p className="text-center text-[0.72rem] text-text-muted mt-2.5">
          İstediğin zaman iptal et · Taahhüt yok
        </p>

        {/* Footer */}
        <div className="mt-10 space-y-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted">
            <Lock className="h-3.5 w-3.5" />
            <p>Tüm işlemler güvenli şekilde yapılır.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center text-[0.72rem] text-text-muted font-medium pt-2">
            <Link href="/terms" className="hover:text-text-primary transition">Koşullar</Link>
            <Link href="/privacy" className="hover:text-text-primary transition">Gizlilik</Link>
            <Link href="/help" className="hover:text-text-primary transition">Yardım Merkezi</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
