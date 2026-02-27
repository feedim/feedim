"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import { useTranslations } from "next-intl";

import { COIN_COMMISSION_RATE, COIN_TO_TRY_RATE, COIN_MIN_PURCHASE, COIN_MAX_PURCHASE } from "@/lib/constants";
import { calculateCoinPurchase } from "@/lib/coinPricing";

export default function CoinsBuyPage() {
  useSearchParams();
  const t = useTranslations("coins");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amountStr, setAmountStr] = useState("");
  const [purchasing, setPurchasing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      setBalance(profile?.coin_balance || 0);
    } catch {} finally { setLoading(false); }
  };

  const amountNum = parseInt(amountStr, 10) || 0;
  const isValid = amountNum >= COIN_MIN_PURCHASE && amountNum <= COIN_MAX_PURCHASE;

  const calc = useMemo(() => {
    if (amountNum < COIN_MIN_PURCHASE) return null;
    return calculateCoinPurchase(amountNum);
  }, [amountNum]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") { setAmountStr(""); return; }
    const num = parseInt(raw, 10);
    if (num > COIN_MAX_PURCHASE) { setAmountStr(String(COIN_MAX_PURCHASE)); return; }
    setAmountStr(raw);
  };

  const purchaseCoins = async () => {
    if (!isValid || !calc) return;

    setPurchasing(true);
    await new Promise(r => setTimeout(r, 2000));

    sessionStorage.setItem('fdm_payment', JSON.stringify({
      amount_try: calc.amountTRY,
      base_coins: calc.baseCoins,
      bonus_coins: calc.bonusCoins,
      total_coins: calc.totalCoins,
    }));

    try { (window as any).ttq?.track('InitiateCheckout', { content_type: 'product', value: calc.amountTRY, currency: 'TRY' }); } catch {}
    emitNavigationStart();
    router.push('/app-payment');
  };

  return (
    <AppLayout headerTitle={t("buyTokens")} hideRightSidebar>
      <div className="py-4 px-3 sm:px-4 max-w-xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <div className="space-y-5">
            {/* Mevcut Bakiye */}
            <div className="bg-bg-secondary rounded-2xl p-5 text-center">
              <p className="text-sm text-text-muted mb-2">{t("currentBalance")}</p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins className="h-7 w-7 text-accent-main" />
                <span className="text-3xl font-bold text-accent-main">{balance.toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-muted">
                ≈ {(balance * COIN_TO_TRY_RATE * (1 - COIN_COMMISSION_RATE)).toFixed(2)} TL <span className="text-xs">(net)</span>
              </p>
            </div>

            {/* Tutar Girişi */}
            <div className="bg-bg-secondary rounded-2xl p-5">
              <label className="block text-sm font-semibold mb-3">{t("enterAmount")}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-text-muted">₺</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountStr}
                  onChange={handleAmountChange}
                  placeholder={String(COIN_MIN_PURCHASE)}
                  className="w-full pl-10 pr-4 py-3.5 bg-bg-primary border border-border-primary rounded-[11px] text-lg font-bold focus:outline-none focus:border-accent-main transition"
                />
              </div>
              <p className="text-xs text-text-muted mt-2">
                {t("minAmount", { min: COIN_MIN_PURCHASE.toLocaleString() })} — {t("maxAmount", { max: COIN_MAX_PURCHASE.toLocaleString() })}
              </p>
            </div>

            {/* Hesaplama Kartı */}
            {calc && (
              <div className="bg-bg-secondary rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-muted">{t("baseTokens")}</span>
                  <span className="text-sm font-semibold">{calc.baseCoins.toLocaleString()} {t("token")}</span>
                </div>

                {calc.bonusPercent > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-accent-main font-medium">{t("bonus", { percent: calc.bonusPercent })}</span>
                    <span className="text-sm font-semibold text-accent-main">+{calc.bonusCoins.toLocaleString()} {t("token")}</span>
                  </div>
                )}

                <div className="h-px bg-border-primary" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t("totalTokens")}</span>
                  <span className="text-lg font-bold text-accent-main">{calc.totalCoins.toLocaleString()} {t("token")}</span>
                </div>
              </div>
            )}

            {/* Satın Al */}
            <button
              onClick={purchaseCoins}
              disabled={!isValid || purchasing}
              className="t-btn accept w-full"
              aria-label={t("proceedToPayment")}
            >
              {purchasing ? <span className="loader" /> : isValid && calc ? `${calc.totalCoins.toLocaleString()} ${t("token")} — ₺${calc.amountTRY.toLocaleString()}` : t("proceedToPayment")}
            </button>

            {/* Komisyon Bilgisi */}
            <p className="text-xs text-text-muted text-center">
              {t("commissionInfo", { rate: COIN_COMMISSION_RATE * 100 })}
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
