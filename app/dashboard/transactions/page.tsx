"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TransactionCard from "@/components/TransactionCard";
import MobileBottomNav from "@/components/MobileBottomNav";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (page > 0) {
      loadMoreTransactions();
    }
  }, [page]);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setPage(p => p + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load user's coin balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('coin_balance')
        .eq('user_id', user.id)
        .single();

      setBalance(profile?.coin_balance || 0);

      // Load transactions
      const { data: txns } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);

      const hasMoreItems = (txns?.length || 0) === ITEMS_PER_PAGE;
      setHasMore(hasMoreItems);

      setTransactions(txns || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTransactions = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const start = page * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE - 1;

      const { data: txns } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(start, end);

      const hasMoreItems = (txns?.length || 0) === ITEMS_PER_PAGE;

      setTransactions([...transactions, ...(txns || [])]);
      setHasMore(hasMoreItems);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
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
          <h1 className="text-lg font-semibold">İşlem Geçmişi</h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <Coins className="h-5 w-5 text-yellow-500" />
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-yellow-500">{balance.toLocaleString()}</span>
              <span className="text-sm text-yellow-500 font-medium">FL</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 pt-16 pb-24 md:pb-16 max-w-4xl">

        {transactions.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <Heart className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-3 sm:mb-4" />
            <h2 className="text-lg sm:text-xl font-bold mb-2">Henüz işlem yok</h2>
            <p className="text-gray-400 mb-5 sm:mb-6 text-sm sm:text-base">Başlamak için coin satın alın.</p>
            <Link href="/dashboard/coins">
              <button className="btn-primary">
                FL Satın Al
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((txn) => (
              <TransactionCard key={txn.id} transaction={txn} />
            ))}
          </div>
        )}

        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-8">
            <Heart className="h-12 w-12 text-pink-500 fill-pink-500 animate-pulse" />
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
