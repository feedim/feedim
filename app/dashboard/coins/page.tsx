"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import TransactionCard from "@/components/TransactionCard";
import MobileBottomNav from "@/components/MobileBottomNav";

interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_try: number;
  bonus_coins: number;
  is_popular: boolean;
  display_order: number;
}

export default function CoinsPage() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      setBalance(profile?.coin_balance || 0);

      const { data: pkgs } = await supabase
        .from('coin_packages')
        .select('*')
        .order('display_order', { ascending: true });

      setPackages(pkgs || []);

      if (pkgs && pkgs.length > 0) {
        setSelectedAmount(pkgs[0].coins);
      }

      // Load last 5 transactions
      const { data: txns } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setTransactions(txns || []);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const getSelectedPackage = () => {
    if (packages.length === 0) return null;

    // Find closest package to selected amount
    let closest = packages[0];
    let minDiff = Math.abs(packages[0].coins - selectedAmount);

    for (const pkg of packages) {
      const diff = Math.abs(pkg.coins - selectedAmount);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pkg;
      }
    }

    return closest;
  };

  const purchaseCoins = () => {
    const pkg = getSelectedPackage();
    if (!pkg) {
      toast.error("Paket seçilmedi");
      return;
    }

    // Paket bilgilerini sessionStorage'a kaydet ve ödeme sayfasına yönlendir
    sessionStorage.setItem('forilove_payment', JSON.stringify({
      package_id: pkg.id,
      package_name: pkg.name,
      price: pkg.price_try,
      coins: pkg.coins,
      bonus_coins: pkg.bonus_coins,
    }));

    router.push('/dashboard/payment');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-3 sm:px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">FL Coin Al</h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <Coins className="h-5 w-5 text-yellow-500" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-yellow-500">{balance.toLocaleString()}</span>
              <span className="text-sm text-yellow-500 font-medium">FL</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 pt-16 pb-24 md:pb-16 max-w-[600px]">
        {packages.length > 0 && (() => {
          const pkg = getSelectedPackage();
          if (!pkg) return null;

          const totalCoins = pkg.coins + pkg.bonus_coins;

          return (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="text-5xl sm:text-6xl font-bold text-yellow-500">
                  {totalCoins.toLocaleString()} FL
                </div>
                {pkg.bonus_coins > 0 && (
                  <div className="text-sm text-gray-400 mb-2">
                    +{pkg.bonus_coins.toLocaleString()} bonus coin
                  </div>
                )}
                <div className="text-3xl font-bold mb-0 leading-none">{pkg.price_try}₺</div>
                <p className="text-sm text-gray-400">{pkg.name}</p>
              </div>

              <input
                type="range"
                min="0"
                max={packages.length - 1}
                step="1"
                value={packages.findIndex(p => p.coins === pkg.coins)}
                onChange={(e) => {
                  const index = parseInt(e.target.value);
                  setSelectedAmount(packages[index].coins);
                }}
                className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-8
                  [&::-webkit-slider-thumb]:h-8
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-yellow-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-moz-range-thumb]:w-8
                  [&::-moz-range-thumb]:h-8
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-yellow-500
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:shadow-lg"
              />

              <button
                onClick={purchaseCoins}
                className="btn-primary w-full py-3 sm:py-4 text-sm sm:text-lg" style={{ background: 'var(--color-yellow-500)', color: 'black' }}
              >
                Satın Al
              </button>

              <div className="text-center space-y-4 pt-8 border-t border-white/10">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">
                    Premium şablonların kilidini açmak için FL Coin kullanın
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center text-sm">
                  <Link href="/fl-coins" className="text-gray-400 hover:text-white transition">
                    FL Coins Hakkında
                  </Link>
                  <Link href="/payment-security" className="text-gray-400 hover:text-white transition">
                    Ödeme Güvenliği
                  </Link>
                  <Link href="/refund-policy" className="text-gray-400 hover:text-white transition">
                    İade Politikası
                  </Link>
                </div>
              </div>

              {/* Recent Transactions */}
              {transactions.length > 0 && (
                <div className="pt-8 border-t border-white/10">
                  <div className="space-y-4">
                    {transactions.map((txn) => (
                      <TransactionCard key={txn.id} transaction={txn} />
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Link href="/dashboard/transactions">
                      <button className="btn-secondary px-6 py-3">
                        Tüm İşlem Geçmişi
                      </button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </main>

      <MobileBottomNav />
    </div>
  );
}
