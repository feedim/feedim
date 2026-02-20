"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield, AlertTriangle, FileText, Users, Wallet,
  Check, X, Eye, EyeOff, ChevronRight, RefreshCw,
  Ban, UserCheck, Award, Clock,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { SettingsItemSkeleton } from "@/components/Skeletons";

interface Overview {
  pendingReports: number;
  flaggedPosts: number;
  spamUsers: number;
  pendingWithdrawals: number;
  recentActions: any[];
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "reports" | "flagged_posts" | "spam_users" | "withdrawals">("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async (currentTab: string, p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?tab=${currentTab}&page=${p}`);
      const data = await res.json();

      if (currentTab === "overview") {
        setOverview(data);
      } else if (currentTab === "reports") {
        setItems(data.reports || []);
        setTotal(data.total || 0);
      } else if (currentTab === "flagged_posts") {
        setItems(data.posts || []);
        setTotal(data.total || 0);
      } else if (currentTab === "spam_users") {
        setItems(data.users || []);
        setTotal(data.total || 0);
      } else if (currentTab === "withdrawals") {
        setItems(data.withdrawals || []);
        setTotal(data.total || 0);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(tab, page); }, [tab, page, loadData]);

  const takeAction = async (action: string, targetType: string, targetId: string, reason?: string) => {
    setActionLoading(targetId);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_type: targetType, target_id: targetId, reason }),
      });
      if (res.ok) {
        loadData(tab, page);
      }
    } catch {} finally { setActionLoading(null); }
  };

  const tabs = [
    { id: "overview", label: "Genel", icon: Shield },
    { id: "reports", label: "Raporlar", icon: AlertTriangle },
    { id: "flagged_posts", label: "Bayraklı", icon: FileText },
    { id: "spam_users", label: "Spam", icon: Users },
    { id: "withdrawals", label: "Çekim", icon: Wallet },
  ] as const;

  return (
    <AppLayout headerTitle="Moderasyon" hideRightSidebar>
      <div className="pb-10">
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 sticky top-0 z-10 bg-bg-primary sticky-ambient overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.78rem] font-semibold transition whitespace-nowrap ${
                tab === t.id ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <SettingsItemSkeleton count={4} />
        ) : tab === "overview" && overview ? (
          <div className="px-4 space-y-4 py-2">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={AlertTriangle} label="Bekleyen Rapor" value={overview.pendingReports} color="text-error" onClick={() => setTab("reports")} />
              <StatCard icon={FileText} label="Bayraklı Gönderi" value={overview.flaggedPosts} color="text-warning" onClick={() => setTab("flagged_posts")} />
              <StatCard icon={Users} label="Spam Kullanıcı" value={overview.spamUsers} color="text-accent-main" onClick={() => setTab("spam_users")} />
              <StatCard icon={Wallet} label="Bekleyen Çekim" value={overview.pendingWithdrawals} color="text-info" onClick={() => setTab("withdrawals")} />
            </div>

            {/* Quick links */}
            <div className="space-y-1">
              <Link href="/dashboard/admin/coupons" className="flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition">
                <span className="text-[0.82rem] font-medium">Kupon Yonetimi</span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
              <Link href="/dashboard/admin/projects" className="flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-xl hover:bg-bg-tertiary transition">
                <span className="text-[0.82rem] font-medium">Proje Yonetimi</span>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            </div>

            {/* Recent actions */}
            {overview.recentActions.length > 0 && (
              <div>
                <h3 className="text-[0.78rem] font-semibold text-text-muted mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Son Aksiyonlar
                </h3>
                <div className="space-y-1">
                  {overview.recentActions.map((action: any) => (
                    <div key={action.id} className="flex items-center gap-3 px-3 py-2 bg-bg-secondary rounded-lg text-[0.75rem]">
                      <span className="font-medium">{action.moderator?.username || "admin"}</span>
                      <span className="text-text-muted">{action.action}</span>
                      <span className="text-text-muted">→ {action.target_type}/{action.target_id}</span>
                      <span className="ml-auto text-text-muted text-[0.65rem]">{new Date(action.created_at).toLocaleDateString("tr-TR")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === "reports" ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Bekleyen rapor yok</div>
            ) : items.map((r: any) => (
              <div key={r.id} className="bg-bg-secondary rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[0.72rem] text-text-muted mb-1">
                      <span>{r.content_type}</span>
                      <span>·</span>
                      <span>{r.reason}</span>
                    </div>
                    <p className="text-[0.82rem] font-medium mb-1">
                      Raporlayan: {r.reporter?.username || "—"}
                    </p>
                    <p className="text-[0.75rem] text-text-muted">
                      Hedef yazar: {r.content_author?.username || "—"}
                    </p>
                    {r.description && (
                      <p className="text-[0.72rem] text-text-muted mt-2 line-clamp-2">{r.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => takeAction("resolve_report", "report", r.id)}
                      disabled={actionLoading === String(r.id)}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                    ><Check className="h-4 w-4" /></button>
                    <button
                      onClick={() => takeAction("dismiss_report", "report", r.id)}
                      disabled={actionLoading === String(r.id)}
                      className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition"
                    ><X className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "flagged_posts" ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Bayrakli gonderi yok</div>
            ) : items.map((p: any) => (
              <div key={p.id} className="bg-bg-secondary rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.82rem] font-medium truncate">{p.title}</p>
                    <p className="text-[0.72rem] text-text-muted mt-0.5">
                      {p.author?.username || "—"} · Spam: {(p.spam_score || 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => takeAction("approve_post", "post", p.id)}
                      disabled={actionLoading === String(p.id)}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                    ><Check className="h-4 w-4" /></button>
                    <button
                      onClick={() => takeAction("remove_post", "post", p.id)}
                      disabled={actionLoading === String(p.id)}
                      className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition"
                    ><X className="h-4 w-4" /></button>
                    <Link href={`/post/${p.slug}`}
                      className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition"
                    ><Eye className="h-4 w-4" /></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "spam_users" ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Spam kullanici yok</div>
            ) : items.map((u: any) => (
              <div key={u.user_id} className="bg-bg-secondary rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={u.avatar_url || "/imgs/default-avatar.jpg"}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-[0.82rem] font-medium flex items-center gap-1.5">
                        {u.full_name || u.username}
                        {u.shadow_banned && (
                          <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-warning/20 text-warning rounded">SB</span>
                        )}
                      </p>
                      <p className="text-[0.72rem] text-text-muted">
                        @{u.username} · Spam: {(u.spam_score || 0).toFixed(0)} · Güven: {u.trust_level}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    {/* Shadow ban toggle */}
                    {!u.shadow_banned ? (
                      <button
                        onClick={() => takeAction("shadow_ban", "user", u.user_id)}
                        disabled={actionLoading === u.user_id}
                        className="p-2 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition"
                        title="Shadow Ban"
                      ><EyeOff className="h-4 w-4" /></button>
                    ) : (
                      <button
                        onClick={() => takeAction("unshadow_ban", "user", u.user_id)}
                        disabled={actionLoading === u.user_id}
                        className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                        title="Shadow Ban Kaldir"
                      ><Eye className="h-4 w-4" /></button>
                    )}
                    {/* Ban toggle */}
                    {u.status !== "blocked" ? (
                      <button
                        onClick={() => takeAction("ban_user", "user", u.user_id)}
                        disabled={actionLoading === u.user_id}
                        className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition"
                        title="Engelle"
                      ><Ban className="h-4 w-4" /></button>
                    ) : (
                      <button
                        onClick={() => takeAction("unban_user", "user", u.user_id)}
                        disabled={actionLoading === u.user_id}
                        className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                        title="Engeli kaldir"
                      ><UserCheck className="h-4 w-4" /></button>
                    )}
                    <Link href={`/u/${u.username}`}
                      className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition"
                    ><Eye className="h-4 w-4" /></Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === "withdrawals" ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Bekleyen cekim talebi yok</div>
            ) : items.map((w: any) => (
              <div key={w.id} className="bg-bg-secondary rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <img
                        src={w.user?.avatar_url || "/imgs/default-avatar.jpg"}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-[0.82rem] font-medium">{w.user?.full_name || w.user?.username}</p>
                        <p className="text-[0.68rem] text-text-muted">@{w.user?.username}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[0.72rem]">
                      <div><span className="text-text-muted">Miktar:</span> <span className="font-semibold">{w.amount} jeton</span></div>
                      <div><span className="text-text-muted">TL:</span> <span className="font-semibold">{Number(w.amount_try).toFixed(2)} TL</span></div>
                      <div className="col-span-2"><span className="text-text-muted">IBAN:</span> <span className="font-mono text-[0.68rem]">{w.iban}</span></div>
                      <div className="col-span-2"><span className="text-text-muted">Hesap Sahibi:</span> <span>{w.iban_holder}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => takeAction("approve_withdrawal", "withdrawal", w.id)}
                      disabled={actionLoading === String(w.id)}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                      title="Onayla"
                    ><Check className="h-4 w-4" /></button>
                    <button
                      onClick={() => takeAction("reject_withdrawal", "withdrawal", w.id, "Talep reddedildi")}
                      disabled={actionLoading === String(w.id)}
                      className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition"
                      title="Reddet"
                    ><X className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Pagination */}
        {tab !== "overview" && total > 20 && (
          <div className="flex items-center justify-center gap-2 px-4 py-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-[0.78rem] font-medium bg-bg-secondary disabled:opacity-40"
            >Onceki</button>
            <span className="text-[0.75rem] text-text-muted">
              {page} / {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1.5 rounded-lg text-[0.78rem] font-medium bg-bg-secondary disabled:opacity-40"
            >Sonraki</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: any; label: string; value: number; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="bg-bg-secondary rounded-xl p-4 text-left hover:bg-bg-tertiary transition w-full">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[0.72rem] text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </button>
  );
}
