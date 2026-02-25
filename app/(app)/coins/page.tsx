"use client";

import { useEffect, useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Coins, Send, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TransactionCard from "@/components/TransactionCard";
import AppLayout from "@/components/AppLayout";
import { useTranslations } from "next-intl";

import { COIN_TO_TRY_RATE, COIN_COMMISSION_RATE } from "@/lib/constants";

export default function CoinsPage() {
  useSearchParams();
  const t = useTranslations("coins");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: profile }, { data: txns }] = await Promise.all([
        supabase
          .from('profiles')
          .select('coin_balance')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('coin_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      setBalance(profile?.coin_balance || 0);
      setTransactions(txns || []);
    } catch {} finally { setLoading(false); }
  };

  const grossTry = balance * COIN_TO_TRY_RATE;
  const netTry = grossTry * (1 - COIN_COMMISSION_RATE);

  return (
    <AppLayout headerTitle={t("balance")} hideRightSidebar>
      <div className="py-4 px-3 sm:px-4 max-w-xl mx-auto space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : (
          <>
            {/* Bakiye Kartı */}
            <div className="bg-bg-secondary rounded-2xl p-5 text-center">
              <p className="text-sm text-text-muted mb-2">{t("currentBalance")}</p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins className="h-8 w-8 text-accent-main" />
                <span className="text-4xl font-bold text-accent-main">{balance.toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-muted">
                ≈ {netTry.toFixed(2)} TL <span className="text-xs">(net)</span>
              </p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/coins/buy"
                className="flex items-center justify-center gap-2 py-3.5 bg-accent-main text-white font-bold rounded-2xl transition hover:opacity-90 active:scale-[0.97]"
              >
                <Plus className="h-4 w-4" />
                {t("loadTokens")}
              </Link>
              <Link
                href="/withdrawal"
                className="flex items-center justify-center gap-2 py-3.5 bg-bg-inverse text-bg-primary font-bold rounded-2xl transition hover:opacity-90 active:scale-[0.97]"
              >
                <Send className="h-4 w-4" />
                {t("withdraw")}
              </Link>
            </div>

            {/* Son İşlemler */}
            {transactions.length > 0 && (
              <>
                <div className="bg-bg-secondary rounded-2xl px-[22px] py-[29px]">
                  <h3 className="text-sm font-semibold mb-4">{t("recentTransactions")}</h3>
                  <div className="space-y-3">
                    {transactions.map((txn) => (
                      <TransactionCard key={txn.id} transaction={txn} />
                    ))}
                  </div>
                </div>
                <Link
                  href="/transactions"
                  className="flex items-center justify-center gap-1.5 w-full py-3 text-sm font-medium text-accent-main hover:opacity-80 transition"
                >
                  {t("viewAllTransactions")} <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
