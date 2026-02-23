"use client";

import { useEffect, useState, useRef } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import { ArrowLeft, Lock, AlertCircle, Coins, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";

interface CoinPaymentData {
  package_id: string;
  package_name: string;
  price: number;
  coins: number;
  bonus_coins: number;
}

export default function PaymentPage() {
  useSearchParams();
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
      router.replace("/dashboard/subscription-payment");
      return;
    }

    // Coin ödemesi kontrol et
    const coinRaw = sessionStorage.getItem("fdm_payment");
    if (!coinRaw) {
      router.push("/dashboard");
      return;
    }

    try {
      const parsed = JSON.parse(coinRaw) as CoinPaymentData;
      if (!parsed.package_id) {
        router.push("/dashboard");
        return;
      }
      setData(parsed);
      setLoading(false);
    } catch {
      router.push("/dashboard");
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
          feedimAlert("error", "Giriş yapılmadı");
          router.push("/login");
          return;
        }

        const response = await fetch("/api/payment/payttr/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ package_id: data.package_id }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.error || "Ödeme başlatılamadı");
          return;
        }

        if (result.token) {
          sessionStorage.removeItem("fdm_payment");
          sessionStorage.setItem("fdm_payment_pending", "true");
          setIframeToken(result.token);
        } else {
          setError("Ödeme işlenemedi");
        }
      } catch (err: any) {
        setError("Ödeme hatası: " + (err.message || "Lütfen tekrar deneyin"));
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

  const totalCoins = data ? (data.coins || 0) + (data.bonus_coins || 0) : 0;

  return (
    <div className="min-h-screen text-text-primary">
      <header className="sticky top-0 z-50 bg-bg-primary sticky-ambient">
        <nav className="container mx-auto px-4 flex items-center justify-between h-[53px] max-w-[520px]">
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else { emitNavigationStart(); router.push("/dashboard"); } }}
            className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[0.95rem] font-semibold">Ödeme</h1>
          <div className="w-8" />
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-24 max-w-[520px]">
        {/* Sipariş Özeti */}
        {data && (
          <div className="bg-bg-secondary rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-accent-main/10 flex items-center justify-center">
                  <Coins className="h-5 w-5 text-accent-main" />
                </div>
                <div>
                  <p className="font-semibold">{data.package_name}</p>
                  <p className="text-sm text-text-muted">
                    {totalCoins.toLocaleString()} Jeton
                    {data.bonus_coins > 0 && (
                      <span className="text-accent-main"> (+{data.bonus_coins} bonus)</span>
                    )}
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold">{data.price}₺</p>
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
                  Tekrar Dene
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
              <p>Ödeme süresince sayfayı kapatmayın. Tamamlandığında otomatik yönlendirileceksiniz.</p>
            </div>
          </div>
        ) : !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-10 w-10 text-accent-main animate-spin" />
            <p className="text-text-muted text-sm">Ödeme formu yükleniyor...</p>
          </div>
        ) : null}

        {/* Info & Legal */}
        <div className="mt-6 bg-bg-secondary rounded-xl px-4 py-3 space-y-1.5 text-xs text-text-muted font-medium">
          <p>Tüm işlemler 256-bit SSL şifreleme ve 3D Secure ile korunur.</p>
          <p>Ödeme altyapısı PayTR tarafından sağlanmaktadır.</p>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 justify-center text-[0.72rem] text-text-muted font-medium pt-4">
          <Link href="/help/terms" className="hover:text-text-primary transition">Koşullar</Link>
          <Link href="/help/privacy" className="hover:text-text-primary transition">Gizlilik</Link>
          <Link href="/help" className="hover:text-text-primary transition">Yardım Merkezi</Link>
        </div>
      </main>
    </div>
  );
}
