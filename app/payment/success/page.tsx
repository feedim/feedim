"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Coins, AlertCircle, Loader2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PaymentSuccessPage() {
  const [authorized, setAuthorized] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [paymentType, setPaymentType] = useState<"coin" | "premium" | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [coinsAdded, setCoinsAdded] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const pending = sessionStorage.getItem("fdm_payment_pending");
    if (!pending) {
      router.push("/dashboard");
      return;
    }
    sessionStorage.removeItem("fdm_payment_pending");
    setAuthorized(true);

    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setVerifying(false); return; }

        const start = Date.now();
        while (!cancelled && Date.now() - start < 30000) {
          const res = await fetch("/api/payment/verify", {
            method: "POST",
            headers: { "Authorization": `Bearer ${session.access_token}` },
          });
          const body = await res.json().catch(() => null);

          if (!res.ok) {
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }

          if (body?.status === "completed") {
            setVerified(true);
            setPaymentType(body.type || "coin");

            if (body.type === "premium") {
              setPlanName(body.plan_name);
              // Premium satın alma sonrası welcome flag
              sessionStorage.setItem("fdm_welcome_premium", JSON.stringify({
                plan_name: body.plan_name,
                plan_id: body.premium_plan,
              }));
            } else {
              setCoinBalance(body.coin_balance);
              setCoinsAdded(body.coins_added);
            }

            setVerifying(false);
            return;
          }

          if (body?.status !== "pending" && body?.status !== "rate_limited") {
            break;
          }

          await new Promise(r => setTimeout(r, 3000));
        }
        setVerifying(false);
      } catch {
        setVerifying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, supabase]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-accent-main animate-spin" />
      </div>
    );
  }

  const isPremium = paymentType === "premium";

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className={`absolute inset-0 ${verified ? "bg-accent-main/20" : verifying ? "bg-accent-main/10" : "bg-error/20"} rounded-full blur-2xl animate-pulse`} />
            {verified ? (
              isPremium ? (
                <Sparkles className="h-24 w-24 text-accent-main relative" />
              ) : (
                <CheckCircle className="h-24 w-24 text-accent-main relative" />
              )
            ) : verifying ? (
              <Coins className="h-24 w-24 text-accent-main relative animate-pulse" />
            ) : (
              <AlertCircle className="h-24 w-24 text-error relative" />
            )}
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          {verified ? (
            <>
              <h1 className="text-4xl font-bold text-accent-main">
                Ödeme Başarılı!
              </h1>
              {isPremium ? (
                <>
                  <p className="text-base text-text-muted">
                    Premium {planName} planınız aktif edildi
                  </p>
                  <p className="text-sm text-text-muted">
                    Tüm premium özelliklere artık erişebilirsiniz.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base text-text-muted">
                    {coinsAdded != null
                      ? `${coinsAdded.toLocaleString("tr-TR")} jeton hesabınıza eklendi`
                      : "Jetonlarınız hesabınıza eklendi"}
                  </p>
                  {coinBalance != null && (
                    <p className="text-sm text-text-muted">
                      Güncel bakiyeniz: <span className="text-accent-main font-semibold">{coinBalance.toLocaleString("tr-TR")} jeton</span>
                    </p>
                  )}
                </>
              )}
            </>
          ) : verifying ? (
            <>
              <h1 className="text-3xl font-bold text-accent-main">
                Ödeme Doğrulanıyor...
              </h1>
              <p className="text-base text-text-muted">
                Ödemeniz işleniyor, lütfen bekleyin
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-error">
                Doğrulama Zaman Aşımı
              </h1>
              <p className="text-base text-text-muted">
                Ödemeniz işleniyor olabilir. Hesabınız birkaç dakika içinde güncellenecektir.
                Sorun devam ederse destek ile iletişime geçin.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="t-btn accept w-full block text-center"
          >
            Ana Sayfaya Dön
          </Link>

          {isPremium ? (
            <Link
              href="/premium"
              className="t-btn cancel w-full block text-center"
            >
              Premium Özellikleri Gör
            </Link>
          ) : (
            <Link
              href="/dashboard/coins"
              className="t-btn cancel w-full block text-center"
            >
              Bakiyemi Görüntüle
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
