"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TransactionCard from "@/components/TransactionCard";
import { TransactionListSkeleton } from "@/components/Skeletons";
import AppLayout from "@/components/AppLayout";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
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

  const loadMore = () => { setPage(p => p + 1); };

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

      const { data: txns } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);

      setHasMore((txns?.length || 0) === ITEMS_PER_PAGE);
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
      setTransactions([...transactions, ...(txns || [])]);
      setHasMore((txns?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMore(false);
    }
  };

  const headerRight = (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-main/10 rounded-full">
      <Coins className="h-4 w-4 text-accent-main" />
      <span className="text-sm font-bold text-accent-main">{balance.toLocaleString()}</span>
    </div>
  );

  return (
    <AppLayout headerRightAction={headerRight} hideRightSidebar>
      <div className="px-4 py-4">
        {loading ? (
          <TransactionListSkeleton count={6} />
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <Coins className="h-12 w-12 text-accent-main/40 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">Henüz işlem yok</h2>
            <p className="text-sm text-text-muted mb-5">Başlamak için Jeton satın alın.</p>
            <Link href="/dashboard/coins" className="t-btn accept inline-block">
              Jeton Satın Al
            </Link>
          </div>
        ) : (
          <div>
            {transactions.map((txn) => (
              <TransactionCard key={txn.id} transaction={txn} />
            ))}
          </div>
        )}

        <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
      </div>
    </AppLayout>
  );
}
