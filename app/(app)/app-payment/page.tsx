"use client";

import { useEffect, useState, useRef } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { smartBack } from "@/lib/smartBack";
import { ArrowLeft, Lock, AlertCircle, Coins, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import { useTranslations } from "next-intl";

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
  const [data, setData] = useState<CoinPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iframeToken, setIframeToken] = useState("");
  const initiatedRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Premium ödemesi gelirse yeni sayfaya yönlendir
    const premiumRaw = sessionStorage.getItem("fdm_premium");
    if (premiumRaw) {
      router.replace("/subscription-payment");
      return;
    }

    // Coin ödemesi kontrol et
    const coinRaw = sessionStorage.getItem("fdm_payment");
    if (!coinRaw) {
      router.push("/");
      return;
    }

    try {
      const parsed = JSON.parse(coinRaw) as CoinPaymentData;
      if (!parsed.amount_try) {
        router.push("/");
        return;
      }
      setData(parsed);
      setLoading(false);
    } catch {
      router.push("/");
    }
  }, [router]);

  // PayTR token al
  useEffect(() => {
    if (!data || initiatedRef.current) return;
    initiatedRef.current = true;

    const initiatePayment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          feedimAlert("error", t("notLoggedIn"));
          router.push("/login");
          return;
        }

        const response = await fetch("/api/payment/payttr/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_try: data.amount_try }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || t("paymentInitFailed"));
          return;
        }

        if (result.token) {
          sessionStorage.removeItem("fdm_payment");
          sessionStorage.setItem("fdm_payment_pending", "true");
          setIframeToken(result.token);
        } else {
          setError(t("paymentProcessFailed"));
        }
      } catch (err: any) {
        setError(t("paymentError") + ": " + (err.message || t("pleaseTryAgain")));
      }
    };

    initiatePayment();
  }, [data, router, supabase]);

  if (loading || (!data && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-accent-main animate-spin" />
      </div>
    );
  }

  const totalCoins = data ? data.total_coins : 0;

  return (
    <div className="min-h-screen text-text-primary">
      <header className="z-50 bg-bg-primary">
        <nav className="container mx-auto px-4 flex items-center justify-between h-[53px] max-w-[520px]">
          <button
            onClick={() => smartBack(router, "/")}
            className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[0.95rem] font-semibold">{t("paymentTitle")}</h1>
          <div className="w-8" />
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-24 max-w-[520px]">
        {/* Sipariş Özeti */}
        {data && (
          <div className="bg-bg-secondary rounded-2xl p-5 mb-6">
            <p className="text-[0.8rem] text-text-secondary font-bold uppercase tracking-wider mb-4">{t("paymentSummary")}</p>

            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.88rem] text-text-muted">{tc("baseTokens")}</span>
              <span className="text-[0.88rem] font-semibold">{data.base_coins.toLocaleString()} {tc("token")}</span>
            </div>

            {data.bonus_coins > 0 && (
              <div className="flex items-center justify-between mb-3">
                <span className="text-[0.88rem] text-accent-main font-medium">{tc("bonus", { percent: data.base_coins > 0 ? Math.round((data.bonus_coins / data.base_coins) * 100) : 0 })}</span>
                <span className="text-[0.88rem] font-semibold text-accent-main">+{data.bonus_coins.toLocaleString()} {tc("token")}</span>
              </div>
            )}

            <div className="h-px bg-border-primary/60 my-3" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.88rem] font-bold">{tc("totalTokens")}</span>
              <span className="text-[0.88rem] font-bold text-accent-main">{totalCoins.toLocaleString()} {tc("token")}</span>
            </div>

            <div className="h-px bg-border-primary/60 my-3" />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.88rem] text-text-muted">{t("subtotal")}</span>
              <span className="text-[0.88rem] text-text-muted">₺{(data.amount_try / 1.20).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-[0.88rem] text-text-muted">{t("taxIncluded", { rate: 20 })}</span>
              <span className="text-[0.88rem] text-text-muted">₺{(data.amount_try - data.amount_try / 1.20).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[0.95rem] font-bold">{t("total")}</span>
              <span className="text-[1.1rem] font-bold">₺{data.amount_try.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-2xl border border-error/20 bg-error/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-error mt-0.5 shrink-0" />
              <div>
                <p className="text-error font-medium text-sm mb-2">{error}</p>
                <button
                  onClick={() => {
                    setError("");
                    initiatedRef.current = false;
                    if (data) setData({ ...data });
                  }}
                  className="text-xs text-error underline hover:text-error/80 transition"
                >
                  {t("retry")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PayTR iFrame */}
        {iframeToken ? (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-border-primary bg-white">
              <iframe
                src={`https://www.paytr.com/odeme/guvenli/${iframeToken}`}
                id="paytriframe"
                frameBorder="0"
                scrolling="yes"
                className="w-full border-0"
                style={{ minHeight: 560 }}
                allow="payment"
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-text-muted">
              <Lock className="h-3.5 w-3.5" />
              <p>{t("doNotClosePayment")}</p>
            </div>
          </div>
        ) : !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 text-accent-main animate-spin" />
            <p className="text-text-muted text-sm">{t("paymentFormLoading")}</p>
          </div>
        ) : null}

        {/* Info & Legal */}
        <div className="mt-6 bg-bg-secondary rounded-[15px] px-4 py-3 space-y-1.5 text-xs text-text-muted font-medium">
          <p>{t("sslSecure")}</p>
        </div>

      </main>
    </div>
  );
}
