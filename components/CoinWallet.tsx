"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Coins } from "lucide-react";
import Link from "next/link";

export function CoinWallet() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      setBalance(profile?.coin_balance || 0);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl animate-pulse" aria-label="Bakiye yükleniyor">
        <Coins className="h-5 w-5 text-yellow-500" aria-hidden="true" />
        <span className="font-bold">...</span>
      </div>
    );
  }

  return (
    <Link href="/dashboard/coins" aria-label={`FL Coin bakiyesi: ${balance.toLocaleString()}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl transition-all cursor-pointer group">
        <Coins className="h-5 w-5 text-yellow-500" aria-hidden="true" />
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-yellow-500">{balance.toLocaleString()}</span>
          <span className="text-sm text-yellow-500 font-medium">FL</span>
        </div>
      </div>
    </Link>
  );
}
