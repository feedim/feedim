"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, AlertCircle, CheckCircle, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import { COIN_COMMISSION_RATE } from "@/lib/constants";

interface CoinPaymentData {
  package_id: string;
  package_name: string;
  price: number;
  coins: number;
  bonus_coins: number;
}

export default function PaymentPage() {
  const [data, setData] = useState<CoinPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
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
    if (coinRaw) {
      try {
        const parsed = JSON.parse(coinRaw);
        if (parsed.package_id) {
          setData(parsed as CoinPaymentData);
          setLoading(false);
          // Fetch balance
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              supabase.from("profiles").select("coin_balance").eq("user_id", user.id).single()
                .then(({ data: p }) => { if (p) setBalance(p.coin_balance || 0); });
            }
          });
          return;
        }
      } catch {}
    }

    router.push("/dashboard");
  }, [router]);

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
        body: JSON.stringify({ type: "coin", package_id: data.package_id }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.error || "İşlem başarısız, lütfen daha sonra tekrar deneyin");
        return;
      }

      sessionStorage.removeItem("fdm_payment");
      setSuccess(result);
    } catch (err: any) {
      setError("Bir hata oluştu, lütfen daha sonra tekrar deneyin");
    } finally {
      setProcessing(false);
    }
  };

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
      <header className="sticky top-0 z-50 bg-bg-primary sticky-ambient border-b border-border-primary/50">
        <nav className="container mx-auto px-4 flex items-center justify-between h-[53px] max-w-[520px]">
          <button
            onClick={() => { if (window.history.length > 1) router.back(); else router.push("/dashboard"); }}
            className="i-btn !w-8 !h-8 text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[0.95rem] font-semibold">Jeton Satın Al</h1>
          <div className="w-8" />
        </nav>
      </header>

      <main className="container mx-auto px-4 pt-6 pb-24 max-w-[520px]">
        {/* Mevcut Bakiye */}
        {!success && balance !== null && (
          <div className="bg-bg-secondary rounded-2xl p-5 text-center mb-6">
            <p className="text-sm text-text-muted mb-2">Mevcut Bakiye</p>
            <div className="flex items-center justify-center gap-2">
              <Coins className="h-7 w-7 text-accent-main" />
              <span className="text-3xl font-bold text-accent-main">{balance.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Başarı ekranı */}
        {success ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-accent-main/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-10 w-10 text-accent-main" />
            </div>
            <h2 className="text-xl font-bold mb-2">İşlem Başarılı!</h2>
            <p className="text-text-muted mb-1">
              <span className="text-accent-main font-bold">{success.coins_added}</span> Jeton hesabınıza eklendi
            </p>
            <p className="text-text-muted text-sm mb-8">
              Güncel bakiyeniz: <span className="font-bold text-accent-main">{success.coin_balance}</span> Jeton
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="t-btn accept w-full"
              >
                Ana Sayfaya Dön
              </button>
              <button
                onClick={() => router.push("/dashboard/coins")}
                className="t-btn cancel w-full"
              >
                Bakiye Sayfası
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Sipariş Özeti */}
            {data && (
              <div className="rounded-2xl bg-bg-secondary p-5 mb-6">
                <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-4">Sipariş Özeti</p>
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

                {/* Komisyon / Vergi Detayları */}
                <div className="mt-4 pt-4 border-t border-border-primary space-y-2 text-sm">
                  <div className="flex justify-between text-text-muted">
                    <span>Paket fiyatı</span>
                    <span>{data.price}₺</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Feedim komisyonu (%{COIN_COMMISSION_RATE * 100})</span>
                    <span>Dahil</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>KDV</span>
                    <span>Dahil</span>
                  </div>
                  <div className="flex justify-between font-semibold text-text-primary pt-2 border-t border-border-primary">
                    <span>Toplam</span>
                    <span>{data.price}₺</span>
                  </div>
                </div>
              </div>
            )}

            {/* Hata */}
            {error && (
              <div className="rounded-2xl border border-error/20 bg-error/5 p-4 mb-6">
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

            {/* Satın Al Butonu */}
            <button
              onClick={handlePurchase}
              disabled={processing}
              className="premium-cta-btn w-full disabled:opacity-50"
            >
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  İşleniyor...
                </span>
              ) : (
                `${totalCoins.toLocaleString()} Jeton Satın Al — ${data?.price}₺`
              )}
            </button>

            {/* Alt Bilgi */}
            <div className="mt-8 space-y-2 text-center">
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
          </>
        )}
      </main>
    </div>
  );
}
