"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heart, Lock, CreditCard, Eye, EyeOff } from "lucide-react";
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
  const [processing, setProcessing] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

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
    } catch {
      router.push("/dashboard/coins");
      return;
    }

    setLoading(false);
  }, [router]);

  const handleCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setCardExpiry(digits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      toast.error("Geçerli bir kart numarası girin");
      return;
    }

    const [month, year] = cardExpiry.split("/");
    if (!month || !year || parseInt(month) < 1 || parseInt(month) > 12) {
      toast.error("Geçerli bir son kullanma tarihi girin");
      return;
    }

    if (cardCvv.length < 3) {
      toast.error("Geçerli bir CVV girin");
      return;
    }

    if (cardName.trim().length < 3) {
      toast.error("Kart üzerindeki ismi girin");
      return;
    }

    setProcessing(true);

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
        body: JSON.stringify({
          package_id: data.package_id,
          user_id: user.id,
          card: {
            number: cleanCardNumber,
            expiry_month: month,
            expiry_year: year,
            cvv: cardCvv,
            owner: cardName.trim(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Ödeme başlatılamadı");
        return;
      }

      if (result.payment_url) {
        sessionStorage.removeItem("forilove_payment");
        sessionStorage.setItem("forilove_payment_pending", "true");
        setIframeUrl(result.payment_url);
      } else {
        toast.error("Ödeme işlenemedi");
      }
    } catch (error: any) {
      toast.error("Ödeme hatası: " + (error.message || "Lütfen tekrar deneyin"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  const totalCoins = data.coins + data.bonus_coins;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => { if (window.history.length > 1) { router.back(); } else { router.push('/dashboard'); } }} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Ödeme</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 pt-6 pb-24 md:pb-16 max-w-[480px]">
        {/* Order Summary */}
        <div className="bg-zinc-900 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">{data.package_name}</p>
              <p className="text-xl font-bold text-yellow-500">
                {totalCoins.toLocaleString()} FL Coin
              </p>
              {data.bonus_coins > 0 && (
                <p className="text-xs text-gray-500 mt-0.5">
                  +{data.bonus_coins.toLocaleString()} bonus dahil
                </p>
              )}
            </div>
            <p className="text-2xl font-bold">{data.price}₺</p>
          </div>
        </div>

        {/* 3D Secure iframe — PayTR kart onay sayfası */}
        {iframeUrl ? (
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white">
              <iframe
                src={iframeUrl}
                className="w-full border-0"
                style={{ minHeight: 480 }}
                allow="payment"
              />
            </div>
            <p className="text-center text-xs text-gray-500">
              Ödeme süresince sayfayı kapatmayın. Tamamlandığında otomatik yönlendirileceksiniz.
            </p>
          </div>
        ) : (

        /* Card Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-zinc-900 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold">Kart Bilgileri</h2>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Kart Numarası</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => handleCardNumber(e.target.value)}
                required
                maxLength={19}
                className="input-modern w-full tracking-widest"
                autoComplete="cc-number"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Son Kullanma</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="AA/YY"
                  value={cardExpiry}
                  onChange={(e) => handleExpiry(e.target.value)}
                  required
                  maxLength={5}
                  className="input-modern w-full tracking-wider"
                  autoComplete="cc-exp"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">CVV</label>
                <div className="relative">
                  <input
                    type={showCvv ? "text" : "password"}
                    inputMode="numeric"
                    placeholder="000"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    required
                    maxLength={4}
                    className="input-modern w-full pr-10 tracking-widest"
                    autoComplete="cc-csc"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(!showCvv)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    aria-label={showCvv ? "CVV gizle" : "CVV göster"}
                  >
                    {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Kart Üzerindeki İsim</label>
              <input
                type="text"
                placeholder="AD SOYAD"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                required
                maxLength={50}
                className="input-modern w-full uppercase"
                autoComplete="cc-name"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={processing}
            className="btn-primary w-full py-4 text-lg font-bold"
            style={{ background: 'var(--color-yellow-500)', color: 'black' }}
          >
            {processing ? "İşleniyor..." : "Satın Al"}
          </button>

          {/* Info */}
          <div className="bg-zinc-900/50 rounded-xl px-4 py-3 space-y-1.5 text-xs text-gray-500 font-medium">
            <p>Kart bilgileriniz saklanmaz, tek seferlik kullanılır.</p>
            <p>Ödeme süresince sayfayı kapatmayın. Tamamlandığında otomatik yönlendirileceksiniz.</p>
            <p>Tüm işlemler 256-bit SSL şifreleme ve 3D Secure ile korunur.</p>
            <p>Ödeme altyapısı PayTR tarafından sağlanmaktadır.</p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs font-semibold pt-2">
            <Link href="/payment-security" className="text-gray-500 hover:text-white transition">
              Ödeme Güvenliği
            </Link>
            <Link href="/refund-policy" className="text-gray-500 hover:text-white transition">
              İade Politikası
            </Link>
            <Link href="/distance-sales-contract" className="text-gray-500 hover:text-white transition">
              Mesafeli Satış Sözleşmesi
            </Link>
          </div>
        </form>
        )}
      </main>
    </div>
  );
}
