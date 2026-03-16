"use client";

import { useEffect, useState } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import TransactionCard from "@/components/TransactionCard";
import AppLayout from "@/components/AppLayout";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useAuthModal } from "@/components/AuthModal";
import { logClientError } from "@/lib/runtimeLogger";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function TransactionsPage() {
  useSearchParams();
  const t = useTranslations("transactions");
  const locale = useLocale();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const router = useRouter();
  const supabase = createClient();
  const { requireAuth } = useAuthModal();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (page > 0) {
      loadMoreTransactions();
    }
  }, [page]);

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setPage(p => p + 1);
  };

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
      logClientError("[Transactions] loadData error:", error);
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
      setTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        return [...prev, ...(txns || []).filter((t: Transaction) => !existingIds.has(t.id))];
      });
      setHasMore((txns?.length || 0) === ITEMS_PER_PAGE);
    } catch (error) {
      logClientError("[Transactions] loadMore error:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const headerRight = (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-main/10 rounded-full">
      <Coins className="h-4 w-4 text-accent-main" />
      {loading ? (
        <div className="h-[10px] w-8 bg-accent-main/20 rounded-[5px] animate-pulse" />
      ) : (
        <span className="text-sm font-bold text-accent-main">{balance.toLocaleString(locale)}</span>
      )}
    </div>
  );

  return (
    <AppLayout headerRightAction={headerRight} hideRightSidebar>
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-0">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-bg-secondary animate-pulse" />
                  <div className="space-y-[5px]">
                    <div className="h-[9px] w-28 bg-bg-secondary rounded-[5px] animate-pulse" />
                    <div className="h-[8px] w-16 bg-bg-secondary rounded-[5px] animate-pulse" />
                  </div>
                </div>
                <div className="h-[10px] w-16 bg-bg-secondary rounded-[5px] animate-pulse" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-lg font-bold mb-2">{t("emptyTitle")}</h2>
            <p className="text-xs text-text-muted mb-5">{t("emptyDescription")}</p>
            <Link href="/coins" className="t-btn accept inline-block">
              {t("buyCoinsButton")}
            </Link>
          </div>
        ) : (
          <div>
            {transactions.map((txn) => (
              <TransactionCard key={txn.id} transaction={txn} />
            ))}
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
        )}
      </div>
    </AppLayout>
  );
}
