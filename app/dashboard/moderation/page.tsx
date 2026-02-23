"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shield, FileText, Wallet, Check, X, Eye, RefreshCw, UserCheck, ShieldCheck, Users, Flag, AlertTriangle, EyeOff, Copyright, Trash2, ShieldOff } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { SettingsItemSkeleton } from "@/components/Skeletons";
import LoadingShell from "@/components/LoadingShell";
import { feedimAlert } from "@/components/FeedimAlert";
import { formatRelativeDate } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

// overview removed

export default function AdminPage() {
  useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"review" | "withdrawals" | "panel">("review");
  const [subTab, setSubTab] = useState<"contents" | "comments" | "profiles" | "copyright" | "applications">("contents");
  // overview removed
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Preset reason selections (text input removed)
  const [postReasons, setPostReasons] = useState<Record<string, string[]>>({});
  const [commentReasons, setCommentReasons] = useState<Record<string, string[]>>({});
  const [reportReasons, setReportReasons] = useState<Record<string, string[]>>({});
  const [userReasons, setUserReasons] = useState<Record<string, string[]>>({});

  // Management panel (recent users/posts/reports)
  const [panelTab, setPanelTab] = useState<"recent_users" | "recent_posts" | "reports">("recent_users");
  const [panelUsers, setPanelUsers] = useState<any[]>([]);
  const [panelPosts, setPanelPosts] = useState<any[]>([]);
  const [panelReports, setPanelReports] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelUserQuery, setPanelUserQuery] = useState("");
  const [panelPostQuery, setPanelPostQuery] = useState("");
  const [panelUserPage, setPanelUserPage] = useState(1);
  const [panelPostPage, setPanelPostPage] = useState(1);
  const [panelUserHasMore, setPanelUserHasMore] = useState(true);
  const [panelPostHasMore, setPanelPostHasMore] = useState(true);
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adsLoading, setAdsLoading] = useState(false);

  // Copyright scan tool
  const [scanSlug, setScanSlug] = useState("");
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Copyright claims
  const [copyrightClaims, setCopyrightClaims] = useState<any[]>([]);
  const [copyrightClaimsLoading, setCopyrightClaimsLoading] = useState(false);
  const [copyrightClaimsPage, setCopyrightClaimsPage] = useState(1);
  const [copyrightClaimsHasMore, setCopyrightClaimsHasMore] = useState(false);
  const [claimActionLoading, setClaimActionLoading] = useState<number | null>(null);
  const [claimRejectReasons, setClaimRejectReasons] = useState<Record<number, string[]>>({});

  // Copyright applications
  const [copyrightApps, setCopyrightApps] = useState<any[]>([]);
  const [copyrightAppsLoading, setCopyrightAppsLoading] = useState(false);
  const [appActionLoading, setAppActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async (currentTab: string, p = 1, currentSubTab: "contents" | "comments" | "profiles" | "copyright" | "applications" = "contents", append = false) => {
    if (append) setLoadMoreLoading(true); else setLoading(true);
    try {
      let apiTab = currentTab;
      if (currentTab === "review") {
        apiTab = currentSubTab === 'contents' ? 'flagged_posts' : currentSubTab === 'comments' ? 'flagged_comments' : 'moderation_users';
      }
      const res = await fetch(`/api/admin/moderation?tab=${apiTab}&page=${p}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      let newItems: any[] = [];
      if (currentTab === "review") {
        if (currentSubTab === 'contents') newItems = data.posts || [];
        else if (currentSubTab === 'comments') newItems = data.comments || [];
        else newItems = data.users || [];
      } else if (currentTab === "withdrawals") {
        newItems = data.withdrawals || [];
      }

      setTotal(data.total || 0);
      setHasMore(newItems.length >= 10);
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
    } catch {} finally { setLoading(false); setLoadMoreLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'review' && (subTab === 'copyright' || subTab === 'applications')) return;
    loadData(tab, page, subTab);
  }, [tab, page, subTab, loadData]);

  const loadPanel = useCallback(async (t: "recent_users" | "recent_posts" | "reports", q?: string, page = 1, append = false) => {
    setPanelLoading(true);
    try {
      const trimmed = (q || "").trim();
      const queryParam = trimmed.length >= 2 ? `&q=${encodeURIComponent(trimmed)}` : "";
      const res = await fetch(`/api/admin/moderation?tab=${t}&page=${page}${queryParam}&_ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (t === "recent_users") {
        const list = data.users || [];
        setPanelUsers(prev => append ? [...prev, ...list] : list);
        setPanelUserHasMore(!trimmed && list.length >= 10 && page < 5);
      } else if (t === "recent_posts") {
        const list = data.posts || [];
        setPanelPosts(prev => append ? [...prev, ...list] : list);
        setPanelPostHasMore(!trimmed && list.length >= 10 && page < 5);
      } else {
        setPanelReports(data.reports || []);
      }
    } catch {} finally { setPanelLoading(false); }
  }, []);

  useEffect(() => {
    const q = panelTab === "recent_users" ? panelUserQuery : panelTab === "recent_posts" ? panelPostQuery : "";
    const t = setTimeout(() => {
      if (panelTab === "recent_users") {
        setPanelUserPage(1);
        loadPanel(panelTab, q, 1, false);
      } else if (panelTab === "recent_posts") {
        setPanelPostPage(1);
        loadPanel(panelTab, q, 1, false);
      } else {
        loadPanel(panelTab, q, 1, false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [panelTab, panelUserQuery, panelPostQuery, loadPanel]);

  useEffect(() => {
    if (tab !== "panel") return;
    (async () => {
      try {
        const res = await fetch("/api/admin/site-settings/ads");
        const data = await res.json();
        setAdsEnabled(!!data.enabled);
      } catch {}
    })();
  }, [tab]);

  const takeAction = async (action: string, targetType: string, targetId: string, reason?: string) => {
    // Optimistic: remove card + duplicates (same author + title for posts, same author + content for comments)
    const idKey = targetType === 'user' ? 'user_id' : 'id';
    const targetItem = items.find((item: any) => String(item[idKey]) === String(targetId));
    setItems(prev => {
      if (targetType === 'post' && targetItem) {
        const authorUsername = targetItem.author?.username;
        const title = targetItem.title;
        return prev.filter((item: any) => !(item.author?.username === authorUsername && item.title === title));
      }
      if (targetType === 'comment' && targetItem) {
        const authorId = targetItem.author_id;
        const content = targetItem.content;
        return prev.filter((item: any) => !(item.author_id === authorId && item.content === content));
      }
      return prev.filter((item: any) => String(item[idKey]) !== String(targetId));
    });
    setTotal(prev => Math.max(0, prev - 1));

    // API call in background
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_type: targetType, target_id: targetId, reason }),
      });
      if (!res.ok) {
        feedimAlert("error", "İşlem başarısız oldu");
        // Re-fetch to restore the card
        loadData(tab, 1, subTab);
      }
    } catch {
      feedimAlert("error", "İşlem başarısız oldu");
      loadData(tab, 1, subTab);
    }
  };

  const runCopyrightScan = async () => {
    const slug = scanSlug.trim().split('/').pop() || scanSlug.trim();
    if (!slug) return;
    setScanLoading(true);
    setScanError(null);
    setScanResults([]);
    try {
      const res = await fetch("/api/admin/copyright-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) { setScanError(data.error || "Hata"); return; }
      setScanResults(data.results || []);
      if ((data.results || []).length === 0) setScanError("Benzer içerik bulunamadı");
    } catch { setScanError("İstek başarısız"); } finally { setScanLoading(false); }
  };

  const loadCopyrightClaims = useCallback(async (p = 1, append = false) => {
    setCopyrightClaimsLoading(true);
    try {
      const res = await fetch(`/api/admin/copyright-claims?page=${p}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      const list = data.claims || [];
      setCopyrightClaimsHasMore(list.length >= 10);
      setCopyrightClaims(prev => append ? [...prev, ...list] : list);
    } catch {} finally { setCopyrightClaimsLoading(false); }
  }, []);

  const takeCopyrightAction = async (action: 'verify' | 'reject', claimId: number, reason?: string) => {
    setClaimActionLoading(claimId);
    setCopyrightClaims(prev => prev.filter(c => c.id !== claimId));
    try {
      const res = await fetch('/api/admin/copyright-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, claim_id: claimId, reason }),
      });
      if (!res.ok) {
        feedimAlert('error', 'İşlem başarısız oldu');
        loadCopyrightClaims(1);
      }
    } catch {
      feedimAlert('error', 'İşlem başarısız oldu');
      loadCopyrightClaims(1);
    } finally { setClaimActionLoading(null); }
  };

  const loadCopyrightApps = useCallback(async () => {
    setCopyrightAppsLoading(true);
    try {
      const res = await fetch(`/api/admin/copyright-applications?status=pending&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setCopyrightApps(data.applications || []);
    } catch {} finally { setCopyrightAppsLoading(false); }
  }, []);

  const takeCopyrightAppAction = async (action: 'approve' | 'reject', applicationId: number, note?: string) => {
    setAppActionLoading(applicationId);
    setCopyrightApps(prev => prev.filter(a => a.id !== applicationId));
    try {
      const res = await fetch('/api/admin/copyright-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: applicationId, action, note }),
      });
      if (!res.ok) {
        feedimAlert('error', 'Islem basarisiz oldu');
        loadCopyrightApps();
      }
    } catch {
      feedimAlert('error', 'Islem basarisiz oldu');
      loadCopyrightApps();
    } finally { setAppActionLoading(null); }
  };

  useEffect(() => {
    if (tab === 'review' && subTab === 'copyright') {
      setCopyrightClaimsPage(1);
      loadCopyrightClaims(1);
    }
    if (tab === 'review' && subTab === 'applications') {
      loadCopyrightApps();
    }
  }, [tab, subTab, loadCopyrightClaims, loadCopyrightApps]);

  const tabs = [
    { id: "review", label: "İnceleme", icon: Shield },
    { id: "panel", label: "Yönetim", icon: ShieldCheck },
    { id: "withdrawals", label: "Çekim", icon: Wallet },
  ] as const;

  const POST_REASONS = [
    'Cinsellik/çıplaklık', 'Şiddet', 'Nefret söylemi', 'Küfür/hakaret',
    'Spam/promosyon', 'Telif/Kopya içerik', 'Yanıltıcı/misinformation',
    'Siyaset/propaganda', 'Uyuşturucu/illegal', 'Kendine zarar teşviki',
  ];
  const COMMENT_REASONS = [
    'Küfür/hakaret', 'Nefret söylemi', 'Tehdit/taciz',
    'Spam/promosyon', 'Cinsellik/çıplaklık', 'PII ifşası',
  ];
  const PROFILE_REASONS = [
    'Müstehcen avatar', 'Uygunsuz kullanıcı adı', 'Uygunsuz bio',
    'Taklit profil', 'Bot davranışı', 'Spam/promosyon',
    'Çoklu hesap kötüye kullanım', 'Platform dışı yönlendirme',
  ];

  return (
    <AppLayout headerTitle="Moderation" hideRightSidebar>
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
          <LoadingShell><SettingsItemSkeleton count={4} /></LoadingShell>
        ) : tab === "panel" ? (
          <div className="px-4 space-y-3 py-2">
            <div className="flex items-center justify-between px-4 py-3.5 rounded-[13px] bg-bg-secondary">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-text-muted" />
                <div>
                  <span className="text-sm font-medium">Reklamlar</span>
                  <p className="text-xs text-text-muted mt-0.5">AdSense yüklemesi açık/kapalı</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (adsLoading) return;
                  const next = !adsEnabled;
                  setAdsEnabled(next);
                  setAdsLoading(true);
                  try {
                    await fetch("/api/admin/site-settings/ads", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ enabled: next }),
                    });
                    if (next) {
                      document.documentElement.dataset.adsEnabled = "1";
                    } else {
                      document.documentElement.dataset.adsEnabled = "0";
                    }
                  } catch {
                    setAdsEnabled(!next);
                  } finally {
                    setAdsLoading(false);
                  }
                }}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  adsEnabled ? "bg-accent-main" : "bg-bg-tertiary"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  adsEnabled ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPanelTab("recent_users")}
                className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${
                  panelTab === "recent_users" ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span className="inline-flex items-center leading-none h-4">Kullanıcılar</span>
              </button>
              <button
                onClick={() => setPanelTab("recent_posts")}
                className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${
                  panelTab === "recent_posts" ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span className="inline-flex items-center leading-none h-4">İçerikler</span>
              </button>
              <button
                onClick={() => setPanelTab("reports")}
                className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${
                  panelTab === "reports" ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
                }`}
              >
                <span className="inline-flex items-center leading-none h-4">Raporlar</span>
              </button>
            </div>
            {(panelTab === "recent_users" || panelTab === "recent_posts") && (
              <div>
                <input
                  type="text"
                  value={panelTab === "recent_users" ? panelUserQuery : panelPostQuery}
                  onChange={e => panelTab === "recent_users" ? setPanelUserQuery(e.target.value) : setPanelPostQuery(e.target.value)}
                  placeholder={panelTab === "recent_users" ? "Kullanıcı ara (username/isim)..." : "İçerik ara (başlık/slug)..."}
                  className="input-modern w-full !py-2 !text-[0.78rem]"
                />
              </div>
            )}
            {panelLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="skeleton h-5 w-5 rounded-full" />
              </div>
            ) : panelTab === "recent_users" ? (
              panelUsers.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">Kullanıcı bulunamadı</div>
              ) : (
                <>
                  <div className="divide-y divide-border-primary">
                    {panelUsers.map((u: any) => (
                      <Link
                        key={u.user_id}
                        href={`/u/${u.username}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition"
                      >
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <img className="default-avatar-auto w-8 h-8 rounded-full object-cover" alt="" loading="lazy" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[0.82rem] font-semibold truncate">{u.full_name || u.username}</span>
                            {u.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(u.premium_plan)} role={u.role} />}
                            {u.shadow_banned && <EyeOff className="h-3 w-3 text-error" />}
                          </div>
                          <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                            <span>@{u.username}</span>
                            <span className={`px-1 py-0.5 rounded text-[0.6rem] font-medium ${
                              u.status === "active" ? "bg-success/15 text-success" :
                              u.status === "blocked" ? "bg-error/15 text-error" :
                              u.status === "frozen" ? "bg-info/15 text-info" :
                              "bg-warning/15 text-warning"
                            }`}>{u.status}</span>
                            {u.spam_score > 0 && <span className="text-error">S:{u.spam_score}</span>}
                          </div>
                        </div>
                        <span className="text-[0.65rem] text-text-muted shrink-0">
                          {new Date(u.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        </span>
                      </Link>
                    ))}
                  </div>
                  {panelUserHasMore && panelUserQuery.trim().length < 2 && (
                    <div className="flex justify-center py-3">
                      <button
                        onClick={() => {
                          const next = panelUserPage + 1;
                          setPanelUserPage(next);
                          loadPanel("recent_users", panelUserQuery, next, true);
                        }}
                        disabled={panelLoading}
                        className="px-3 py-1.5 rounded-lg text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                      >
                        Daha fazla yükle
                      </button>
                    </div>
                  )}
                </>
              )
            ) : panelTab === "recent_posts" ? (
              panelPosts.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">İçerik bulunamadı</div>
              ) : (
                <>
                  <div className="divide-y divide-border-primary">
                    {panelPosts.map((p: any) => {
                      const author = Array.isArray(p.author) ? p.author[0] : p.author;
                      return (
                        <Link
                          key={p.id}
                          href={`/post/${p.slug}`}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.82rem] font-semibold truncate">{p.title}</p>
                            <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                              <span>@{author?.username || "?"}</span>
                              <span className={`px-1 py-0.5 rounded text-[0.6rem] font-medium ${
                                p.status === "published" ? "bg-success/15 text-success" :
                                p.status === "moderation" ? "bg-warning/15 text-warning" :
                                p.status === "removed" ? "bg-error/15 text-error" :
                                "bg-bg-tertiary text-text-muted"
                              }`}>{p.status}</span>
                              {p.content_type === "video" && <span className="text-accent-main">Video</span>}
                              {p.content_type === "moment" && <span className="text-accent-main">Moment</span>}
                              <span>{p.view_count || 0}g {p.like_count || 0}b</span>
                            </div>
                          </div>
                          <span className="text-[0.65rem] text-text-muted shrink-0">
                            {new Date(p.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  {panelPostHasMore && panelPostQuery.trim().length < 2 && (
                    <div className="flex justify-center py-3">
                      <button
                        onClick={() => {
                          const next = panelPostPage + 1;
                          setPanelPostPage(next);
                          loadPanel("recent_posts", panelPostQuery, next, true);
                        }}
                        disabled={panelLoading}
                        className="px-3 py-1.5 rounded-lg text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                      >
                        Daha fazla yükle
                      </button>
                    </div>
                  )}
                </>
              )
            ) : (
              panelReports.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">Bekleyen rapor yok</div>
              ) : (
                <div className="divide-y divide-border-primary">
                  {panelReports.map((r: any) => {
                    const reporter = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
                    const contentAuthor = Array.isArray(r.content_author) ? r.content_author[0] : r.content_author;
                    return (
                      <div key={r.id} className="px-4 py-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                          <span className="text-[0.78rem] font-semibold truncate">{r.reason || "Rapor"}</span>
                          <span className={`ml-auto px-1.5 py-0.5 rounded text-[0.6rem] font-medium ${
                            r.content_type === "post" ? "bg-accent-main/15 text-accent-main" :
                            r.content_type === "comment" ? "bg-info/15 text-info" :
                            "bg-warning/15 text-warning"
                          }`}>{r.content_type}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                          <span>Raporlayan: @{reporter?.username || "?"}</span>
                          <span>Hedef: @{contentAuthor?.username || "?"}</span>
                          <span className="ml-auto">{new Date(r.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</span>
                        </div>
                        {r.description && <p className="text-[0.72rem] text-text-muted mt-1 line-clamp-2">{r.description}</p>}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        ) : tab === "review" ? (
          <div className="px-4 space-y-3 py-2">
        <div className="flex items-center gap-1">
          {(['contents','comments','profiles','copyright','applications'] as const).map(s => (
            <button key={s} onClick={() => { setSubTab(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${subTab===s?'bg-text-primary text-bg-primary':'text-text-muted hover:text-text-primary'}`}
            >{s==='contents'?'Icerikler':s==='comments'?'Yorumlar':s==='profiles'?'Profiller':s==='copyright'?'Telif':'Basvurular'}</button>
          ))}
          <button onClick={() => loadData('review', page, subTab)} className="ml-auto px-3 py-1.5 rounded-full text-[0.78rem] font-semibold bg-bg-secondary hover:bg-bg-tertiary">Yenile</button>
        </div>

            {/* Copyright scan tool */}
            {subTab === 'contents' && (
              <div className="px-4 mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Copyright className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                    <input
                      type="text"
                      value={scanSlug}
                      onChange={e => setScanSlug(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runCopyrightScan()}
                      placeholder="Post slug veya linki girin..."
                      className="input-modern w-full !py-2 !pl-9 !text-[0.78rem]"
                    />
                  </div>
                  <button
                    onClick={runCopyrightScan}
                    disabled={scanLoading || !scanSlug.trim()}
                    className="px-3 py-2 rounded-lg text-[0.78rem] font-medium bg-warning/15 text-warning hover:bg-warning/25 disabled:opacity-50 transition whitespace-nowrap"
                  >{scanLoading ? "Taranıyor..." : "Tara"}</button>
                </div>
                {scanError && !scanResults.length && (
                  <p className="text-[0.72rem] text-text-muted mt-2">{scanError}</p>
                )}
                {scanResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {scanResults.map((r: any) => (
                      <Link
                        key={r.post_id}
                        href={`/post/${r.slug}`}
                        target="_blank"
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-[0.78rem] transition ${
                          r.similarity >= 60 ? 'bg-warning/10 hover:bg-warning/20' : 'bg-bg-secondary hover:bg-bg-tertiary'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{r.title}</p>
                          <p className="text-[0.68rem] text-text-muted">@{r.author}</p>
                        </div>
                        <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[0.68rem] font-bold ${
                          r.similarity >= 95 ? 'bg-error/20 text-error' :
                          r.similarity >= 80 ? 'bg-warning/20 text-warning' :
                          r.similarity >= 60 ? 'bg-warning/15 text-warning' :
                          'bg-bg-tertiary text-text-muted'
                        }`}>%{r.similarity}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {subTab === 'contents' ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">İnceleme bekleyen gönderi yok</div>
            ) : items.map((p: any) => (
              <div key={p.id} className="bg-bg-secondary rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">{p.content_type || "post"}</span>
                      {p.moderation_category === 'copyright' && (
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-warning/20 text-warning rounded inline-flex items-center gap-1">
                          <Copyright className="h-3 w-3" />Telif
                        </span>
                      )}
                      {p.moderation_due_at && (
                        <span className="text-[0.65rem] text-text-muted">
                          {formatRelativeDate(p.moderation_due_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-[0.82rem] font-medium line-clamp-2">{p.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.author?.avatar_url && (
                        <img src={p.author.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      <p className="text-[0.72rem] text-text-muted">
                        @{p.author?.username || "—"}
                      </p>
                    </div>
                    {p.ai_reason && (
                      <p className="text-[0.72rem] text-accent-main mt-1.5">Neden: {p.ai_reason}</p>
                    )}
                    {p.copyright_match && p.copyright_similarity && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[0.68rem] text-warning font-medium">%{p.copyright_similarity} benzerlik</span>
                        <Link
                          href={`/post/${p.copyright_match.slug}`}
                          target="_blank"
                          className="text-[0.68rem] text-accent-main hover:underline"
                        >
                          Orijinal gönderi (@{p.copyright_match.author_username}) &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => takeAction("approve_content", "post", p.id)}
                      disabled={actionLoading === String(p.id)}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                      title="İncelemeyi kaldır"
                    ><Check className="h-4 w-4" /></button>
                    <button
                      onClick={() => takeAction("dismiss_content", "post", p.id)}
                      disabled={actionLoading === String(p.id)}
                      className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition"
                      title="Sil (kararsız)"
                    ><Trash2 className="h-4 w-4" /></button>
                    <Link href={`/post/${p.slug}`} target="_blank"
                      className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition"
                      title="İçeriği gör"
                    ><Eye className="h-4 w-4" /></Link>
                  </div>
                </div>
                {/* Reject with preset reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {POST_REASONS.map(r => {
                    const selected = (postReasons[p.id] || []).includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => setPostReasons(prev => {
                          const cur = prev[p.id] || [];
                          const next = selected ? cur.filter(x => x !== r) : [...cur, r];
                          return { ...prev, [p.id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                      >{r}</button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => takeAction("approve_content", "post", p.id, (postReasons[p.id] || []).join(', ') || undefined)}
                    disabled={actionLoading === String(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Onayla</button>
                  <button
                    onClick={() => {
                      const reason = (postReasons[p.id] || []).join(', ');
                      if (!reason) return feedimAlert("error", "En az bir sebep seçin");
                      takeAction("reject_content", "post", p.id, reason);
                    }}
                    disabled={actionLoading === String(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Kaldır</button>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => { const next = page + 1; setPage(next); loadData(tab, next, subTab, true); }}
                  disabled={loadMoreLoading}
                  className="px-4 py-2 rounded-lg text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                >{loadMoreLoading ? "Yükleniyor..." : "Daha fazla yükle"}</button>
              </div>
            )}
          </div>
            ) : subTab === 'copyright' ? (
          <div className="px-4 space-y-2 py-2">
            {copyrightClaimsLoading ? (
              <SettingsItemSkeleton count={3} />
            ) : copyrightClaims.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Bekleyen telif hakkı talebi yok</div>
            ) : copyrightClaims.map((claim: any) => {
              const post = Array.isArray(claim.post) ? claim.post[0] : claim.post;
              const claimant = Array.isArray(claim.claimant) ? claim.claimant[0] : claim.claimant;
              const matchedPost = Array.isArray(claim.matched_post) ? claim.matched_post[0] : claim.matched_post;
              const matchedAuthor = Array.isArray(claim.matched_author) ? claim.matched_author[0] : claim.matched_author;
              const hasProof = !!claim.proof_description;
              return (
                <div key={claim.id} className="bg-bg-secondary rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-warning/20 text-warning rounded inline-flex items-center gap-1">
                          <Copyright className="h-3 w-3" />Telif
                        </span>
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                          {claim.content_type || post?.content_type || "post"}
                        </span>
                        {claim.similarity_percent && (
                          <span className={`px-1.5 py-0.5 text-[0.6rem] font-bold rounded ${
                            claim.similarity_percent >= 90 ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'
                          }`}>%{claim.similarity_percent}</span>
                        )}
                        {hasProof && (
                          <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-success/20 text-success rounded">Kanıt var</span>
                        )}
                      </div>
                      <p className="text-[0.82rem] font-medium line-clamp-2">{post?.title || "İçerik bulunamadı"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {claimant?.avatar_url && (
                          <img src={claimant.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                        )}
                        <p className="text-[0.72rem] text-text-muted">
                          Talep eden: @{claimant?.username || "—"} ({claim.owner_name || "—"})
                        </p>
                      </div>
                      {matchedPost && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[0.68rem] text-text-muted">Eşleşen:</span>
                          <Link
                            href={`/post/${matchedPost.slug}`}
                            target="_blank"
                            className="text-[0.68rem] text-accent-main hover:underline truncate"
                          >
                            {matchedPost.title} (@{matchedAuthor?.username || "?"}) &rarr;
                          </Link>
                        </div>
                      )}
                      {hasProof && (
                        <div className="mt-2 bg-bg-tertiary rounded-lg p-2.5">
                          <p className="text-[0.68rem] font-medium text-text-muted mb-1">Kanıt Açıklaması:</p>
                          <p className="text-[0.72rem] text-text-primary line-clamp-3">{claim.proof_description}</p>
                          {claim.proof_urls?.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {claim.proof_urls.map((url: string, i: number) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                  className="text-[0.68rem] text-accent-main hover:underline block truncate">
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}
                          {claim.owner_email && (
                            <p className="text-[0.65rem] text-text-muted mt-1">E-posta: {claim.owner_email}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-3">
                      <button
                        onClick={() => takeCopyrightAction('verify', claim.id)}
                        disabled={claimActionLoading === claim.id}
                        className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                        title="Doğrula ve yayınla"
                      ><Check className="h-4 w-4" /></button>
                      {post?.slug && (
                        <Link href={`/post/${post.slug}`} target="_blank"
                          className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition"
                          title="İçeriği gör"
                        ><Eye className="h-4 w-4" /></Link>
                      )}
                    </div>
                  </div>
                  {/* Reject with preset reasons */}
                  <div className="flex flex-wrap gap-1.5">
                    {['Sahiplik kanıtlanamadı', 'Yeterli kanıt yok', 'Telif/Kopya içerik', 'Yanıltıcı talep'].map(r => {
                      const selected = (claimRejectReasons[claim.id] || []).includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => setClaimRejectReasons(prev => {
                            const cur = prev[claim.id] || [];
                            const next = selected ? cur.filter(x => x !== r) : [...cur, r];
                            return { ...prev, [claim.id]: next };
                          })}
                          className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                        >{r}</button>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        const reason = (claimRejectReasons[claim.id] || []).join(', ');
                        if (!reason) {
                          return feedimAlert('error', 'En az bir sebep seçin');
                        }
                        takeCopyrightAction('reject', claim.id, reason);
                      }}
                      disabled={claimActionLoading === claim.id}
                      className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                    >Reddet ve Kaldır</button>
                  </div>
                </div>
              );
            })}
            {copyrightClaimsHasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => {
                    const next = copyrightClaimsPage + 1;
                    setCopyrightClaimsPage(next);
                    loadCopyrightClaims(next, true);
                  }}
                  disabled={copyrightClaimsLoading}
                  className="px-4 py-2 rounded-lg text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                >{copyrightClaimsLoading ? "Yükleniyor..." : "Daha fazla yükle"}</button>
              </div>
            )}
          </div>
            ) : subTab === 'applications' ? (
          <div className="px-4 space-y-2 py-2">
            {copyrightAppsLoading ? (
              <SettingsItemSkeleton count={3} />
            ) : copyrightApps.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Bekleyen basvuru yok</div>
            ) : copyrightApps.map((app: any) => {
              const profile = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
              return (
                <div key={app.id} className="bg-bg-secondary rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <img className="default-avatar-auto w-8 h-8 rounded-full object-cover" alt="" />
                        )}
                        <div>
                          <p className="text-[0.82rem] font-medium">{profile?.full_name || profile?.username || "?"}</p>
                          <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                            <span>@{profile?.username || "?"}</span>
                            {profile?.profile_score !== undefined && (
                              <span className="px-1 py-0.5 rounded text-[0.6rem] font-medium bg-accent-main/15 text-accent-main">%{Math.round(profile.profile_score)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[0.78rem]">
                        <div><span className="text-text-muted">Sirket:</span> <span className="font-medium">{app.company_name}</span></div>
                        <div><span className="text-text-muted">E-posta:</span> <span>{app.contact_email}</span></div>
                        {app.contact_phone && <div><span className="text-text-muted">Telefon:</span> <span>{app.contact_phone}</span></div>}
                        {app.company_website && (
                          <div>
                            <span className="text-text-muted">Web:</span>{" "}
                            <a href={app.company_website} target="_blank" rel="noopener noreferrer" className="text-accent-main hover:underline truncate">{app.company_website}</a>
                          </div>
                        )}
                        <div className="bg-bg-tertiary rounded-lg p-2.5 mt-2">
                          <p className="text-[0.72rem] text-text-primary whitespace-pre-wrap">{app.description}</p>
                        </div>
                        {app.proof_urls?.length > 0 && (
                          <div className="space-y-0.5 mt-1">
                            <p className="text-[0.68rem] text-text-muted">Kanitlar:</p>
                            {app.proof_urls.map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="text-[0.68rem] text-accent-main hover:underline block truncate">{url}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => takeCopyrightAppAction('approve', app.id)}
                      disabled={appActionLoading === app.id}
                      className="px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium"
                    >Onayla</button>
                    <button
                      onClick={() => {
                        feedimAlert("question", "Basvuruyu reddetmek istediginize emin misiniz?", {
                          showYesNo: true,
                          onYes: () => takeCopyrightAppAction('reject', app.id, 'Basvuru kriterleri karsilanmadi'),
                        });
                      }}
                      disabled={appActionLoading === app.id}
                      className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium"
                    >Reddet</button>
                  </div>
                </div>
              );
            })}
          </div>
            ) : subTab === 'profiles' ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">İncelemede hesap yok</div>
            ) : items.map((u: any, idx: number) => {
              const isBlocked = u.status === 'blocked';
              const isDeleted = u.status === 'deleted';
              const remainingDays = isDeleted && u.updated_at ? Math.max(0, 14 - Math.floor((Date.now() - new Date(u.updated_at).getTime()) / (1000 * 60 * 60 * 24))) : 0;
              const statusLabel = isDeleted ? `silindi (${remainingDays} gün kaldı)` : isBlocked ? 'kapatıldı' : 'incelemede';
              const statusColor = (isDeleted || isBlocked) ? 'text-error' : 'text-warning';
              return (
              <div key={`${u.user_id || u.username || 'spam-user'}-${idx}`} className="bg-bg-secondary rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src={u.avatar_url || "/imgs/default-avatar.jpg"} alt="" className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="text-[0.82rem] font-medium">{u.full_name || u.username}</p>
                      <p className="text-[0.72rem] text-text-muted">@{u.username} <span className={statusColor}>{statusLabel}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <Link href={`/u/${u.username}`} className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition" title="Profili gör"><Eye className="h-4 w-4" /></Link>
                  </div>
                </div>
                {u.moderation_reason && (
                  <p className="text-[0.72rem] text-text-muted mt-2 bg-bg-tertiary rounded-lg px-3 py-1.5">{u.moderation_reason}</p>
                )}
                {/* Hazır nedenler */}
                {!isBlocked && !isDeleted && (
                <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PROFILE_REASONS.map(r => {
                    const selected = (userReasons[u.user_id] || []).includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => setUserReasons(prev => {
                          const cur = prev[u.user_id] || [];
                          const next = selected ? cur.filter(x => x !== r) : [...cur, r];
                          return { ...prev, [u.user_id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                      >{r}</button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => takeAction("activate_user", "user", u.user_id, (userReasons[u.user_id] || []).join(', ') || undefined)}
                    disabled={actionLoading === u.user_id}
                    className="px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Onayla</button>
                  <button
                    onClick={() => {
                      const reason = (userReasons[u.user_id] || []).join(', ');
                      if (!reason) return feedimAlert("error", "En az bir sebep seçin");
                      feedimAlert("question", `${u.username} hesabını kapatmak istediğinize emin misiniz?`, {
                        showYesNo: true,
                        onYes: () => takeAction("ban_user", "user", u.user_id, reason),
                      });
                    }}
                    disabled={actionLoading === u.user_id}
                    className="px-3 py-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Kapat</button>
                  <button
                    onClick={() => {
                      const reason = (userReasons[u.user_id] || []).join(', ');
                      if (!reason) return feedimAlert("error", "En az bir sebep seçin");
                      feedimAlert("question", `${u.username} hesabını silmek istediğinize emin misiniz?`, {
                        showYesNo: true,
                        onYes: () => takeAction("delete_user", "user", u.user_id, reason),
                      });
                    }}
                    disabled={actionLoading === u.user_id}
                    className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Sil</button>
                </div>
                </>
                )}
              </div>
              );
            })}
          </div>
            ) : (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">İnceleme bekleyen yorum yok</div>
            ) : items.map((c: any) => (
              <div key={c.id} className="bg-bg-secondary rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[0.72rem] text-text-muted mb-1">
                      {c.author?.avatar_url ? (
                        <img src={c.author.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <img className="default-avatar-auto w-5 h-5 rounded-full object-cover" alt="" />
                      )}
                      <span>yorum</span>
                      <span className="truncate max-w-[60%]">@{c.author?.username || '—'}</span>
                    </div>
                    <p className="text-[0.78rem] text-text-primary whitespace-pre-wrap break-words line-clamp-3">{c.content || c.gif_url || ''}</p>
                    {c.moderation_reason && (
                      <p className="text-[0.72rem] text-accent-main mt-1.5">Neden: {c.moderation_reason}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <button
                      onClick={() => takeAction("approve_content", "comment", c.id)}
                      disabled={actionLoading === String(c.id)}
                      className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition"
                      title="İncelemeyi Kaldır"
                    ><Check className="h-4 w-4" /></button>
                    <button
                      onClick={() => takeAction("dismiss_content", "comment", c.id)}
                      disabled={actionLoading === String(c.id)}
                      className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 transition"
                      title="Sil (kararsız)"
                    ><Trash2 className="h-4 w-4" /></button>
                    <Link href={`/post/${c.post_slug || c.post_id}`} target="_blank"
                      className="p-2 rounded-lg bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition"
                      title="İçeriği gör"
                    ><Eye className="h-4 w-4" /></Link>
                  </div>
                </div>
                {/* Reject with preset reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMENT_REASONS.map(r => {
                    const selected = (commentReasons[c.id] || []).includes(r);
                    return (
                      <button
                        key={r}
                        onClick={() => setCommentReasons(prev => {
                          const cur = prev[c.id] || [];
                          const next = selected ? cur.filter(x => x !== r) : [...cur, r];
                          return { ...prev, [c.id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                      >{r}</button>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => takeAction("approve_content", "comment", String(c.id), (commentReasons[c.id] || []).join(', ') || undefined)}
                    disabled={actionLoading === String(c.id)}
                    className="px-3 py-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Onayla</button>
                  <button
                    onClick={() => {
                      const reason = (commentReasons[c.id] || []).join(', ');
                      if (!reason) return feedimAlert("error", "En az bir sebep seçin");
                      takeAction("reject_content", "comment", String(c.id), reason);
                    }}
                    disabled={actionLoading === String(c.id)}
                    className="px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >Kaldır</button>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => { const next = page + 1; setPage(next); loadData(tab, next, subTab, true); }}
                  disabled={loadMoreLoading}
                  className="px-4 py-2 rounded-lg text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                >{loadMoreLoading ? "Yükleniyor..." : "Daha fazla yükle"}</button>
              </div>
            )}
          </div>
            )}
          </div>
        ) : tab === "withdrawals" ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">Bekleyen çekim talebi yok</div>
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

        {/* Load-more pagination is now embedded in each section */}
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
