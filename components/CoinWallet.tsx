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
      <div className="flex items-center gap-2 px-4 py-2 bg-bg-secondary rounded-xl" aria-label="Bakiye yükleniyor">
        <Coins className="h-5 w-5 text-accent-main" aria-hidden="true" />
        <div className="skeleton h-4 w-12 rounded-lg" />
      </div>
    );
  }

  return (
    <Link href="/dashboard/coins" aria-label={`Jeton bakiyesi: ${balance.toLocaleString()}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary hover:bg-bg-tertiary rounded-xl transition-all cursor-pointer group">
        <Coins className="h-5 w-5 text-accent-main" aria-hidden="true" />
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-accent-main">{balance.toLocaleString()}</span>
          <span className="text-sm text-accent-main font-medium">Jeton</span>
        </div>
      </div>
    </Link>
  );
}
