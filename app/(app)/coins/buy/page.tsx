"use client";

import { useEffect, useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import Link from "next/link";
import { Coins, Sparkles, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import LoadingShell from "@/components/LoadingShell";
import { COIN_COMMISSION_RATE, COIN_TO_TRY_RATE } from "@/lib/constants";

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_try: number;
  bonus_coins: number;
  is_popular: boolean;
  display_order: number;
}

export default function CoinsBuyPage() {
  useSearchParams();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [{ data: profile }, { data: pkgs }] = await Promise.all([
        supabase.from('profiles').select('coin_balance').eq('user_id', user.id).single(),
        supabase.from('coin_packages').select('*').order('display_order', { ascending: true }),
      ]);

      setBalance(profile?.coin_balance || 0);
      setPackages(pkgs || []);

      if (pkgs && pkgs.length > 0) {
        const popular = pkgs.find(p => p.is_popular);
        setSelectedId(popular?.id || pkgs[0].id);
      }
    } catch {} finally { setLoading(false); }
  };

  const [purchasing, setPurchasing] = useState(false);
  const selectedPkg = packages.find(p => p.id === selectedId) || null;

  const purchaseCoins = async () => {
    if (!selectedPkg) {
      feedimAlert("error", "Paket seçilmedi");
      return;
    }

    setPurchasing(true);
    await new Promise(r => setTimeout(r, 2000));

    sessionStorage.setItem('fdm_payment', JSON.stringify({
      package_id: selectedPkg.id,
      package_name: selectedPkg.name,
      price: selectedPkg.price_try,
      coins: selectedPkg.coins,
      bonus_coins: selectedPkg.bonus_coins || 0,
    }));

    try { (window as any).ttq?.track('InitiateCheckout', { content_type: 'product', value: selectedPkg.price_try, currency: 'TRY' }); } catch {}
    emitNavigationStart();
    router.push('/app-payment');
  };

  return (
    <AppLayout headerTitle="Jeton Satın Al" hideRightSidebar>
      <div className="py-4 px-3 sm:px-4 max-w-xl mx-auto">
        {loading ? (
          <LoadingShell>
            <div className="space-y-4">
              <div className="skeleton h-20 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
            </div>
          </LoadingShell>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-accent-main/10 flex items-center justify-center mb-5">
              <Coins className="h-10 w-10 text-accent-main" />
            </div>
            <h2 className="text-xl font-bold mb-2">Paket Bulunamadı</h2>
            <p className="text-text-muted mb-6 text-sm">Jeton paketleri henüz yapılandırılmamış.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mevcut Bakiye */}
            <div className="bg-bg-secondary rounded-2xl p-5 text-center">
              <p className="text-sm text-text-muted mb-2">Mevcut Bakiye</p>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Coins className="h-7 w-7 text-accent-main" />
                <span className="text-3xl font-bold text-accent-main">{balance.toLocaleString()}</span>
              </div>
              <p className="text-sm text-text-muted">
                ≈ {(balance * COIN_TO_TRY_RATE * (1 - COIN_COMMISSION_RATE)).toFixed(2)} TL <span className="text-xs">(net)</span>
              </p>
            </div>

            {/* Paket Kartları */}
            <div className="space-y-3">
              {packages.map((pkg) => {
                const total = (pkg.coins || 0) + (pkg.bonus_coins || 0);
                const isSelected = pkg.id === selectedId;
                const pricePerCoin = pkg.price_try && total ? (pkg.price_try / total).toFixed(2) : null;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedId(pkg.id)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all relative ${
                      isSelected
                        ? "border-accent-main bg-accent-main/5"
                        : "border-transparent bg-bg-secondary"
                    }`}
                  >
                    {pkg.is_popular && (
                      <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-accent-main text-white text-[11px] font-bold rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Popüler
                      </span>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? "border-accent-main bg-accent-main" : "border-text-muted"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold">{total.toLocaleString()} Jeton</span>
                            {(pkg.bonus_coins || 0) > 0 && (
                              <span className="text-xs text-accent-main font-semibold">+{(pkg.bonus_coins || 0).toLocaleString()} bonus</span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted mt-0.5">{pkg.name}{pricePerCoin ? ` ₺${pricePerCoin}/jeton` : ""}</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold shrink-0">{pkg.price_try}₺</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Satın Al */}
            <button
              onClick={purchaseCoins}
              disabled={!selectedPkg || purchasing}
              className="t-btn accept w-full"
              aria-label="Jeton Satın Al"
            >
              {purchasing ? <span className="loader" /> : selectedPkg ? `${((selectedPkg.coins || 0) + (selectedPkg.bonus_coins || 0)).toLocaleString()} Jeton — ${selectedPkg.price_try}₺` : "Paket Seçin"}
            </button>

            {/* Komisyon Bilgisi */}
            <p className="text-xs text-text-muted text-center">
              Jeton fiyatlarına %{COIN_COMMISSION_RATE * 100} Feedim komisyonu dahildir.
            </p>

            {/* Alt Linkler */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-xs text-text-muted pt-2">
              <Link href="/help/terms" className="hover:text-text-primary transition">Koşullar</Link>
              <Link href="/help/privacy" className="hover:text-text-primary transition">Gizlilik</Link>
              <Link href="/help" className="hover:text-text-primary transition">Yardım Merkezi</Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
