"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Wallet, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

const ITEMS_PER_PAGE = 10;

export default function AdminAffiliatePayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const router = useRouter();
  const supabase = createClient();

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const res = await fetch("/api/admin/affiliate-payouts");
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      if (process.env.NODE_ENV === "development") console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filter]);

  const handleAction = async (payoutId: string, action: "approve" | "reject") => {
    setProcessing(payoutId);
    try {
      const res = await fetch("/api/admin/affiliate-payouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId,
          action,
          adminNote: noteInput[payoutId] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "İşlem başarısız");
        return;
      }
      toast.success(action === "approve" ? "Ödeme onaylandı" : "Ödeme reddedildi");
      loadData();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setProcessing(null);
    }
  };

  const filteredPayouts = payouts.filter(p => filter === "all" || p.status === filter);
  const visiblePayouts = filteredPayouts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPayouts.length;

  const formatIban = (iban: string | null) => {
    if (!iban) return "—";
    return iban.replace(/(.{4})/g, "$1 ").trim();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Affiliate Ödemeleri</h1>
          <div className="w-16" />
        </nav>
      </header>

      <main className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-16 max-w-3xl">
        {loading ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-24" />
            <div className="bg-zinc-900 rounded-2xl p-6 animate-pulse h-60" />
          </div>
        ) : (
          <>
            {/* Özet */}
            {summary && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                  <Clock className="h-5 w-5 text-pink-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-pink-500">{summary.pendingCount}</p>
                  <p className="text-xs text-zinc-400">Bekleyen</p>
                  <p className="text-xs text-pink-500 font-medium">{summary.pendingTotal.toLocaleString('tr-TR')} TRY</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                  <CheckCircle className="h-5 w-5 text-pink-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-pink-400">{summary.approvedCount}</p>
                  <p className="text-xs text-zinc-400">Onaylanan</p>
                  <p className="text-xs text-pink-400 font-medium">{summary.approvedTotal.toLocaleString('tr-TR')} TRY</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                  <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-500">{summary.rejectedCount}</p>
                  <p className="text-xs text-zinc-400">Reddedilen</p>
                </div>
              </div>
            )}

            {/* Filtre */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {(["pending", "all", "approved", "rejected"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition shrink-0 ${
                    filter === f ? "bg-pink-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {f === "all" ? "Tümü" : f === "pending" ? "Bekleyen" : f === "approved" ? "Onaylanan" : "Reddedilen"}
                  {f === "pending" && summary?.pendingCount > 0 && (
                    <span className="ml-1.5 bg-pink-600 text-white text-xs px-1.5 py-0.5 rounded-full">{summary.pendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Ödeme Talepleri */}
            <div className="space-y-4">
              {filteredPayouts.length === 0 ? (
                <div className="bg-zinc-900 rounded-2xl p-8 text-center">
                  <DollarSign className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">
                    {filter === "pending" ? "Bekleyen ödeme talebi yok" : "Bu kategoride talep yok"}
                  </p>
                </div>
              ) : (
                <>
                  {visiblePayouts.map((payout) => (
                    <div key={payout.id} className="bg-zinc-900 rounded-2xl p-5 border border-white/5">
                      {/* Üst: Tutar + Durum */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-2xl font-bold">{Number(payout.amount).toLocaleString('tr-TR')} <span className="text-sm text-zinc-400">TRY</span></p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {new Date(payout.requested_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          payout.status === "pending" ? "bg-pink-500/20 text-pink-500" :
                          payout.status === "approved" ? "bg-pink-400/20 text-pink-400" :
                          "bg-red-500/20 text-red-500"
                        }`}>
                          {payout.status === "pending" ? "Bekliyor" : payout.status === "approved" ? "Onaylandı" : "Reddedildi"}
                        </span>
                      </div>

                      {/* Affiliate Bilgileri */}
                      <div className="bg-white/5 rounded-xl p-3 mb-3 space-y-1">
                        <p className="text-sm"><span className="text-zinc-400">Ad:</span> {payout.affiliate_name}</p>
                        <p className="text-sm"><span className="text-zinc-400">E-posta:</span> {payout.affiliate_email}</p>
                        <p className="text-sm font-mono"><span className="text-zinc-400">IBAN:</span> {formatIban(payout.affiliate_iban)}</p>
                        <p className="text-sm"><span className="text-zinc-400">Hesap Sahibi:</span> {payout.affiliate_holder_name || "—"}</p>
                      </div>

                      {/* İşlenmiş ise not göster */}
                      {payout.status !== "pending" && payout.processed_at && (
                        <p className="text-xs text-zinc-500 mb-2">
                          İşlenme: {new Date(payout.processed_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {payout.admin_note && ` — Not: ${payout.admin_note}`}
                        </p>
                      )}

                      {/* Bekleyen ise onay/red butonları */}
                      {payout.status === "pending" && (
                        <div className="space-y-3 mt-3 pt-3 border-t border-white/5">
                          <input
                            type="text"
                            placeholder="Admin notu (isteğe bağlı)"
                            value={noteInput[payout.id] || ""}
                            onChange={(e) => setNoteInput({ ...noteInput, [payout.id]: e.target.value })}
                            maxLength={500}
                            className="input-modern w-full text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAction(payout.id, "approve")}
                              disabled={processing === payout.id}
                              className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-500 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Onayla
                            </button>
                            <button
                              onClick={() => handleAction(payout.id, "reject")}
                              disabled={processing === payout.id}
                              className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-600 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Reddet
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                      className="w-full py-3 text-sm text-pink-500 hover:text-pink-400 font-medium transition"
                    >
                      Daha Fazla Göster ({filteredPayouts.length - visibleCount} kalan)
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
