"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Coins, Heart, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PaymentSuccessPage() {
  const [authorized, setAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinsAdded, setCoinsAdded] = useState<number | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const pending = sessionStorage.getItem("forilove_payment_pending");
    if (!pending) {
      router.push("/dashboard");
      return;
    }
    sessionStorage.removeItem("forilove_payment_pending");
    const savedReturn = sessionStorage.getItem("forilove_return_url");
    if (savedReturn) {
      setReturnUrl(savedReturn);
      sessionStorage.removeItem("forilove_return_url");
    }
    setAuthorized(true);

    // Verify payment via API (hem doğrulama hem fallback coin ekleme)
    let cancelled = false;
    (async () => {
      try {
        // Auth token al
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setVerifying(false); return; }

        const start = Date.now();
        // Callback'in tamamlanması için birkaç saniye bekle, sonra verify çağır
        while (!cancelled && Date.now() - start < 30000) {
          const res = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          if (!res.ok) {
            // 5xx → tekrar dene
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }
          const data = await res.json();

          if (data.status === 'completed') {
            setVerified(true);
            setCoinBalance(data.coin_balance);
            setCoinsAdded(data.coins_added);
            setVerifying(false);
            return;
          }

          // Hala pending → biraz bekleyip tekrar dene
          await new Promise(r => setTimeout(r, 3000));
        }
        // 30sn geçti, hala pending
        setVerifying(false);
      } catch {
        setVerifying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className={`absolute inset-0 ${verified ? 'bg-yellow-500/20' : verifying ? 'bg-yellow-500/10' : 'bg-red-500/20'} rounded-full blur-2xl animate-pulse`}></div>
            {verified ? (
              <CheckCircle className="h-24 w-24 text-yellow-500 relative" />
            ) : verifying ? (
              <Coins className="h-24 w-24 text-yellow-500 relative animate-pulse" />
            ) : (
              <AlertCircle className="h-24 w-24 text-red-500 relative" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          {verified ? (
            <>
              <h1 className="text-4xl font-bold text-yellow-500">
                Ödeme Başarılı!
              </h1>
              <p className="text-base text-gray-400">
                {coinsAdded != null
                  ? `${coinsAdded} FL Coin hesabınıza eklendi`
                  : 'FL Coin\'leriniz hesabınıza eklendi'}
              </p>
              {coinBalance != null && (
                <p className="text-sm text-gray-500">
                  Güncel bakiyeniz: <span className="text-yellow-500 font-semibold">{coinBalance} FL Coin</span>
                </p>
              )}
            </>
          ) : verifying ? (
            <>
              <h1 className="text-3xl font-bold text-yellow-500">
                Ödeme Doğrulanıyor...
              </h1>
              <p className="text-base text-gray-400">
                Ödemeniz işleniyor, lütfen bekleyin
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-red-500">
                Doğrulama Zaman Aşımı
              </h1>
              <p className="text-base text-gray-400">
                Ödemeniz işleniyor olabilir. Bakiyeniz birkaç dakika içinde güncellenecektir.
                Sorun devam ederse destek ile iletişime geçin.
              </p>
            </>
          )}
        </div>

        {/* Info */}
        <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Coins className="h-6 w-6 text-yellow-500" />
            <p className="text-base font-medium text-gray-300">
              {verifying
                ? 'Ödemeniz işleniyor, bakiyeniz doğrulanıyor...'
                : verified
                  ? 'Artık premium şablonların kilidini açabilirsiniz!'
                  : 'Bakiyeniz kısa süre içinde güncellenecektir'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {returnUrl ? (
            <Link href={returnUrl} className="block">
              <button className="btn-primary w-full py-4 text-lg" style={{ background: 'var(--color-yellow-500)', color: 'black' }}>
                Şablona Dön
              </button>
            </Link>
          ) : (
            <Link href="/dashboard" className="block">
              <button className="btn-primary w-full py-4 text-lg" style={{ background: 'var(--color-yellow-500)', color: 'black' }}>
                Şablonları Keşfet
              </button>
            </Link>
          )}

          <Link href="/dashboard/profile" className="block">
            <button className="btn-secondary w-full py-3">
              Bakiyemi Görüntüle
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
