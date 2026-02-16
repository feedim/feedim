"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, UserPlus, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MobileBottomNav from "@/components/MobileBottomNav";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  date: string;
  detail: string;
};

type Pagination = {
  page: number;
  totalPages: number;
  totalItems: number;
};

const PERIODS = [
  { key: "today", label: "Bugün" },
  { key: "yesterday", label: "Dün" },
  { key: "last7d", label: "7 Gün" },
  { key: "last14d", label: "14 Gün" },
  { key: "thisMonth", label: "Bu Ay" },
  { key: "last3m", label: "3 Ay" },
] as const;

export default function AffiliateTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, totalItems: 0 });
  const [period, setPeriod] = useState("last3m");
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setTransactions([]);
    setPagination({ page: 1, totalPages: 1, totalItems: 0 });
    fetchTransactions(1, true);
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "affiliate") {
      router.push("/dashboard/profile");
      return;
    }

    fetchTransactions(1, true);
  };

  const fetchTransactions = async (page: number, reset: boolean) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/affiliate/transactions?page=${page}&period=${period}`);
      if (res.ok) {
        const data = await res.json();
        if (reset) {
          setTransactions(data.transactions || []);
        } else {
          setTransactions(prev => [...prev, ...(data.transactions || [])]);
        }
        setPagination(data.pagination || { page: 1, totalPages: 1, totalItems: 0 });
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchTransactions(pagination.page + 1, false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">İşlem Geçmişi</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="w-full px-3 sm:px-6 lg:px-10 py-4 sm:py-8 pb-24 md:pb-16">
        <p className="text-xs text-zinc-500 mb-4">Son 3 aya ait satış komisyonları, referans kazançları ve ödeme çekimleriniz.</p>

        {/* Dönem Filtresi */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                period === key ? "bg-pink-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-zinc-800 rounded w-40" />
                    <div className="h-2.5 bg-zinc-800 rounded w-24" />
                  </div>
                  <div className="h-4 bg-zinc-800 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-zinc-500">Bu dönemde işlem bulunamadı.</p>
            <p className="text-xs text-zinc-600 mt-1">Satış komisyonları ve referans kazançları burada görünecektir.</p>
          </div>
        ) : (
          <>
            <div className="bg-zinc-900 rounded-2xl p-4 sm:p-6">
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        tx.type === "payout" ? "bg-red-500/10" : tx.type === "referral" ? "bg-purple-500/10" : "bg-pink-500/10"
                      }`}>
                        {tx.type === "payout" ? (
                          <Send className="h-3.5 w-3.5 text-red-400" />
                        ) : tx.type === "referral" ? (
                          <UserPlus className="h-3.5 w-3.5 text-purple-400" />
                        ) : (
                          <Wallet className="h-3.5 w-3.5 text-pink-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.detail}</p>
                        <p className="text-[10px] text-zinc-500">{new Date(tx.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${tx.amount >= 0 ? "text-pink-500" : "text-red-400"}`}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("tr-TR")} TRY
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {pagination.page < pagination.totalPages && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium text-zinc-400 transition disabled:opacity-50"
              >
                {loadingMore ? "Yükleniyor..." : "Daha Fazla Göster"}
              </button>
            )}

            <p className="text-[10px] text-zinc-600 text-center mt-3">
              {pagination.totalItems} işlem gösteriliyor
            </p>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
