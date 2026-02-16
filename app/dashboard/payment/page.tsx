"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface PaymentData {
  package_id: string;
  package_name: string;
  price: number;
  coins: number;
  bonus_coins: number;
}

export default function PaymentPage() {
  const [data, setData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [iframeToken, setIframeToken] = useState("");
  const initiatedRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const raw = sessionStorage.getItem("forilove_payment");
    if (!raw) {
      router.push("/dashboard/coins");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PaymentData;
      if (!parsed.package_id) {
        router.push("/dashboard/coins");
        return;
      }
      setData(parsed);
      setLoading(false);
    } catch {
      router.push("/dashboard/coins");
    }
  }, [router]);

  // Paket verisi hazır olunca otomatik PayTR token al
  useEffect(() => {
    if (!data || initiatedRef.current) return;
    initiatedRef.current = true;

    const initiatePayment = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Giriş yapılmadı");
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
          sessionStorage.removeItem("forilove_payment");
          sessionStorage.setItem("forilove_payment_pending", "true");
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

  if (!data && !error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  const totalCoins = data ? data.coins + data.bonus_coins : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
          <button
            onClick={() => {
              if (window.history.length > 1) router.back();
              else router.push("/dashboard");
            }}
            className="flex items-center gap-2 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Ödeme</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="w-full px-3 sm:px-6 lg:px-10 pt-6 pb-24 md:pb-16">
        {/* Order Summary */}
        {data && (
          <div className="bg-zinc-900 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400 mb-1">{data.package_name}</p>
                <p className="text-xl font-bold text-yellow-500">
                  {totalCoins.toLocaleString()} FL
                </p>
                {data.bonus_coins > 0 && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    +{data.bonus_coins.toLocaleString()} bonus dahil
                  </p>
                )}
              </div>
              <p className="text-2xl font-bold">{data.price}₺</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-950/50 border border-red-500/30 rounded-2xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-300 font-medium mb-2">{error}</p>
                <button
                  onClick={() => {
                    setError("");
                    initiatedRef.current = false;
                    if (data) setData({ ...data });
                  }}
                  className="text-sm text-red-400 underline hover:text-red-300 transition"
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
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white">
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
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Lock className="h-3.5 w-3.5" />
              <p>Ödeme süresince sayfayı kapatmayın. Tamamlandığında otomatik yönlendirileceksiniz.</p>
            </div>
          </div>
        ) : !error ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Heart className="h-10 w-10 text-pink-500 fill-pink-500 animate-pulse" />
            <p className="text-zinc-400 text-sm">Ödeme formu yükleniyor...</p>
          </div>
        ) : null}

        {/* Info & Legal */}
        <div className="mt-6 bg-zinc-900/50 rounded-xl px-4 py-3 space-y-1.5 text-xs text-zinc-500 font-medium">
          <p>Tüm işlemler 256-bit SSL şifreleme ve 3D Secure ile korunur.</p>
          <p>Ödeme altyapısı PayTR tarafından sağlanmaktadır.</p>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs font-semibold pt-4">
          <Link href="/payment-security" className="text-zinc-500 hover:text-white transition">
            Ödeme Güvenliği
          </Link>
          <Link href="/refund-policy" className="text-zinc-500 hover:text-white transition">
            İade Politikası
          </Link>
          <Link href="/distance-sales-contract" className="text-zinc-500 hover:text-white transition">
            Mesafeli Satış Sözleşmesi
          </Link>
        </div>
      </main>
    </div>
  );
}
