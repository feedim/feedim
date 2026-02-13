"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Coins, Heart } from "lucide-react";

export default function PaymentSuccessPage() {
  const [authorized, setAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const router = useRouter();
  const supabase = (await import("@/lib/supabase/client")).createClient();

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
    // Kısa doğrulama: bakiye artmış mı kontrol et (maks 30sn)
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setVerifying(false); return; }
        const start = Date.now();
        let success = false;
        // Kullanıcının son 1 saat içindeki tamamlanan ödeme var mı?
        while (!cancelled && Date.now() - start < 30000) {
          const { data: payments } = await supabase
            .from('coin_payments')
            .select('status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);
          if (payments?.some(p => p.status === 'completed')) { success = true; break; }
          await new Promise(r => setTimeout(r, 2000));
        }
        setVerifying(false);
      } catch { setVerifying(false); }
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
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
            <CheckCircle className="h-24 w-24 text-yellow-500 relative" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-yellow-500">
            Ödeme Başarılı!
          </h1>
          <p className="text-base text-gray-400">
            FL Coin'leriniz hesabınıza eklendi
          </p>
        </div>

        {/* Info */}
        <div className="bg-zinc-900 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Coins className="h-6 w-6 text-yellow-500" />
            <p className="text-base font-medium text-gray-300">
              {verifying ? 'Ödemeniz işleniyor, bakiyeniz doğrulanıyor...' : 'Artık premium şablonların kilidini açabilirsiniz!'}
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
