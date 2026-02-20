"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Lock, Eye, ExternalLink, ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import { formatCount } from "@/lib/utils";
import MobileBottomNav from "@/components/MobileBottomNav";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (!loading) loadProjects(page);
  }, [page]);

  const checkAdmin = async () => {
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

    loadProjects(0);
  };

  const loadProjects = async (pg: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/projects?page=${pg}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setTotal(data.total || 0);
        setPage(data.page || 0);
        setTotalPages(data.totalPages || 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleDelete = async (projectId: string, title: string) => {
    if (!confirm(`"${title}" gönderisini kalıcı olarak silmek istediğinize emin misiniz?`)) return;
    setDeletingId(projectId);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (res.ok) {
        feedimAlert("success", "Gönderi silindi");
        loadProjects(page);
      } else {
        feedimAlert("error", "Silme başarısız, lütfen daha sonra tekrar deneyin");
      }
    } catch {
      feedimAlert("error", "Silme başarısız, lütfen daha sonra tekrar deneyin");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = searchQuery.trim()
    ? projects.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  return (
    <div className="min-h-screen text-text-primary">
      <header className="sticky top-0 z-50 bg-bg-primary sticky-ambient min-h-[73px]">
        <nav className="w-full px-3 sm:px-6 lg:px-10 flex items-center justify-between min-h-[73px]">
          <button onClick={() => router.push("/dashboard/profile")} className="flex items-center gap-2 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Geri</span>
          </button>
          <h1 className="text-lg font-semibold">Yayınlanan Gönderiler</h1>
          <span className="text-sm text-text-muted w-16 text-right">{total}</span>
        </nav>
      </header>

      <main className="w-full px-3 sm:px-6 lg:px-10 py-4 pb-24 md:pb-8 max-w-3xl mx-auto">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton rounded-xl h-16" />
            ))}
          </div>
        ) : (<>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 100))}
              placeholder="Gönderi, kullanıcı veya slug ara..."
              maxLength={100}
              className="w-full bg-bg-inverse/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted"
            />
          </div>
          {filtered.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-12">
            {searchQuery ? "Sonuç bulunamadı." : "Henüz yayınlanan gönderi yok."}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {filtered.map((p: any) => (
                <div key={p.id} className="bg-bg-inverse/[0.06] rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {p.is_public ? (
                        <Globe className="h-3.5 w-3.5 text-success shrink-0" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-warning shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{p.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${p.is_public ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                        {p.is_public ? 'Public' : 'Gizli'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="truncate">@{p.creator_name}</span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Eye className="h-3 w-3" />
                        {formatCount(p.view_count || 0)}
                      </span>
                      <span className="shrink-0">{new Date(p.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-[11px] text-text-muted font-mono truncate block">/p/{p.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/p/${p.slug}`}
                      target="_blank"
                      className="p-2 rounded-lg hover:bg-bg-inverse/10 transition"
                      title="Görüntüle"
                    >
                      <ExternalLink className="h-4 w-4 text-text-muted" />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id, p.title)}
                      disabled={deletingId === p.id}
                      className="p-2 rounded-lg hover:bg-error/10 transition disabled:opacity-30"
                      title="Sil"
                    >
                      <Trash2 className={`h-4 w-4 ${deletingId === p.id ? 'text-text-muted' : 'text-error'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-primary">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Önceki
                </button>
                <span className="text-xs text-text-muted">
                  Sayfa {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Sonraki
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
        </>)}
      </main>

      <MobileBottomNav />
    </div>
  );
}
