"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, CheckCircle, XCircle, Clock, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

const ITEMS_PER_PAGE = 10;

export default function AdminAffiliateApplicationsPage() {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [processing, setProcessing] = useState<string | null>(null);
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

      const res = await fetch("/api/admin/affiliate-applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
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

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filter]);

  const handleAction = async (applicationId: string, action: "approve" | "reject") => {
    setProcessing(applicationId);
    try {
      const res = await fetch("/api/admin/affiliate-applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "İşlem başarısız");
        return;
      }
      toast.success(action === "approve" ? "Başvuru onaylandı — kullanıcı affiliate yapıldı" : "Başvuru reddedildi");
      loadData();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setProcessing(null);
    }
  };

  const filteredApps = applications.filter(a => filter === "all" || a.status === filter);
  const visibleApps = filteredApps.slice(0, visibleCount);
  const hasMore = visibleCount < filteredApps.length;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl min-h-[73px]">
        <nav className="container mx-auto px-6 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Affiliate Başvuruları</h1>
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
            {/* Summary */}
            {summary && (
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                  <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-yellow-500">{summary.pendingCount}</p>
                  <p className="text-xs text-zinc-400">Bekleyen</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-500">{summary.approvedCount}</p>
                  <p className="text-xs text-zinc-400">Onaylanan</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl p-4 text-center">
                  <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" />
                  <p className="text-xl font-bold text-red-500">{summary.rejectedCount}</p>
                  <p className="text-xs text-zinc-400">Reddedilen</p>
                </div>
              </div>
            )}

            {/* Filter */}
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

            {/* Applications */}
            <div className="space-y-4">
              {filteredApps.length === 0 ? (
                <div className="bg-zinc-900 rounded-2xl p-8 text-center">
                  <Users className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-zinc-500">
                    {filter === "pending" ? "Bekleyen başvuru yok" : "Bu kategoride başvuru yok"}
                  </p>
                </div>
              ) : (
                <>
                  {visibleApps.map((app) => (
                    <div key={app.id} className="bg-zinc-900 rounded-2xl p-5 border border-white/5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">{app.full_name || "İsimsiz"}</p>
                          <p className="text-xs text-zinc-500">{app.email}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {new Date(app.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          app.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                          app.status === "approved" ? "bg-green-500/20 text-green-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {app.status === "pending" ? "Bekliyor" : app.status === "approved" ? "Onaylandı" : "Reddedildi"}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="bg-white/5 rounded-xl p-3 mb-3 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Sosyal Medya</span>
                          {(() => {
                            try {
                              const url = app.social_media.startsWith("http") ? app.social_media : `https://${app.social_media}`;
                              const parsed = new URL(url);
                              if (parsed.protocol === "https:" || parsed.protocol === "http:") {
                                return (
                                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 flex items-center gap-1 truncate max-w-[220px]">
                                    {app.social_media.replace(/^https?:\/\/(www\.)?/, "")}
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                );
                              }
                              return <span className="text-zinc-300 truncate max-w-[220px]">{app.social_media}</span>;
                            } catch {
                              return <span className="text-zinc-300 truncate max-w-[220px]">{app.social_media}</span>;
                            }
                          })()}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-zinc-400">Takipçi</span>
                          <span className="text-white font-medium">{Number(app.followers).toLocaleString("tr-TR")}</span>
                        </div>
                        {app.description && (
                          <div className="text-sm pt-1 border-t border-white/5">
                            <span className="text-zinc-400">Açıklama: </span>
                            <span className="text-zinc-300">{app.description}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(app.id, "approve")}
                            disabled={processing === app.id}
                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction(app.id, "reject")}
                            disabled={processing === app.id}
                            className="flex-1 py-2.5 bg-red-600/80 hover:bg-red-600 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {hasMore && (
                    <button
                      onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                      className="w-full py-3 text-sm text-pink-500 hover:text-pink-400 font-medium transition"
                    >
                      Daha Fazla Göster ({filteredApps.length - visibleCount} kalan)
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
