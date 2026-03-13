"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Shield, FileText, Wallet, Check, X, Eye, RefreshCw, UserCheck, ShieldCheck, Users, Flag, AlertTriangle, EyeOff, Copyright, ShieldOff, UserPlus, UserMinus } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import AppLayout from "@/components/AppLayout";
import { feedimAlert } from "@/components/FeedimAlert";
import { formatRelativeDate } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { COUNTRIES } from "@/lib/countries";
import { useUser } from "@/components/UserContext";
import LazyAvatar from "@/components/LazyAvatar";
import { redirectToLogin } from "@/lib/loginNext";
import { logClientError } from "@/lib/runtimeLogger";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import ModerationSupportLinkCard from "@/components/support/ModerationSupportLinkCard";

const COUNTRY_NAME = Object.fromEntries(
  COUNTRIES.map(c => [c.code, { tr: c.name_tr, en: c.name_en, az: c.name_az }])
);
function getCountryName(code: string, lang?: string): string {
  const entry = COUNTRY_NAME[code.toUpperCase()];
  if (!entry) return code;
  const key = `${lang || 'tr'}` as 'tr' | 'en' | 'az';
  return entry[key] || entry.tr || code;
}

// overview removed

export default function AdminPage() {
  useSearchParams();
  const t = useTranslations("moderation");
  const ts = useTranslations("support");
  const tb = useTranslations("boost");
  const locale = useLocale();
  const { user: currentUser } = useUser();
  const isAdmin = currentUser?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [moderationAssignment, setModerationAssignment] = useState<string | null>(null);
  const [moderationCountry, setModerationCountry] = useState<string | null>(null);
  const [assignmentLoaded, setAssignmentLoaded] = useState(false);
  const [tab, setTab] = useState<"review" | "applications" | "payments" | "panel">("review");
  const [subTab, setSubTab] = useState<"contents" | "comments" | "profiles" | "reports" | "ads" | "copyright_claims" | "support">("contents");
  const [supportSubTab, setSupportSubTab] = useState<"appeals" | "general">("appeals");
  const [appSubTab, setAppSubTab] = useState<"copyright_apps" | "monetization">("copyright_apps");
  const [paySubTab, setPaySubTab] = useState<"withdrawals" | "refunds">("withdrawals");
  const [profileSubTab, setProfileSubTab] = useState<"moderation" | "blocked" | "deleted">("moderation");
  // overview removed
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Preset reason selections
  const [postReasons, setPostReasons] = useState<Record<string, string[]>>({});
  const [commentReasons, setCommentReasons] = useState<Record<string, string[]>>({});
  const [reportReasons, setReportReasons] = useState<Record<string, string[]>>({});
  const [userReasons, setUserReasons] = useState<Record<string, string[]>>({});
  const [customReasons, setCustomReasons] = useState<Record<string, string>>({});
  const [copyrightAppReasons, setCopyrightAppReasons] = useState<Record<number, string[]>>({});

  // Management panel (recent users/posts/comments/reports/moderators)
  const [panelTab, setPanelTab] = useState<"moderators" | "recent_users" | "recent_posts" | "recent_comments" | "stats">("recent_users");
  const [moderators, setModerators] = useState<any[]>([]);
  const [moderatorsLoading, setModeratorsLoading] = useState(false);
  const [panelUsers, setPanelUsers] = useState<any[]>([]);
  const [panelPosts, setPanelPosts] = useState<any[]>([]);
  const [panelComments, setPanelComments] = useState<any[]>([]);
  const [panelReports, setPanelReports] = useState<any[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelUserQuery, setPanelUserQuery] = useState("");
  const [panelPostQuery, setPanelPostQuery] = useState("");
  const [panelCommentQuery, setPanelCommentQuery] = useState("");
  const [adsEnabled, setAdsEnabled] = useState(false);
  const [adsFeed, setAdsFeed] = useState(false);
  const [adsMoments, setAdsMoments] = useState(false);
  const [adsVideo, setAdsVideo] = useState(false);
  const [adsPostDetail, setAdsPostDetail] = useState(false);
  const [adsLoading, setAdsLoading] = useState(false);

  // Captcha gate: every moderation action requires puzzle verification
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const requireCaptcha = useCallback((action: () => void) => {
    pendingActionRef.current = action;
    setCaptchaOpen(true);
  }, []);
  const handleCaptchaVerify = useCallback(() => {
    setCaptchaOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

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
  const [claimCustomReasons, setClaimCustomReasons] = useState<Record<number, string>>({});

  // Copyright applications
  const [copyrightApps, setCopyrightApps] = useState<any[]>([]);
  const [copyrightAppsLoading, setCopyrightAppsLoading] = useState(false);
  const [appActionLoading, setAppActionLoading] = useState<number | null>(null);

  // Monetization applications
  const [monetizationApps, setMonetizationApps] = useState<any[]>([]);
  const [monetizationAppsLoading, setMonetizationAppsLoading] = useState(false);
  const [monetizationActionLoading, setMonetizationActionLoading] = useState<string | null>(null);

  // Stats dashboard
  const [statsFixed, setStatsFixed] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [queryResults, setQueryResults] = useState<Record<string, any>>({});
  const [queryLoading, setQueryLoading] = useState(false);

  // Boosts
  const [boostItems, setBoostItems] = useState<any[]>([]);
  const [boostsLoading, setBoostsLoading] = useState(false);
  const [boostActionLoading, setBoostActionLoading] = useState<number | null>(null);
  const [boostRejectReasons, setBoostRejectReasons] = useState<Record<number, string[]>>({});
  const [allBoosts, setAllBoosts] = useState<any[]>([]);
  const [allBoostsLoading, setAllBoostsLoading] = useState(false);
  const [boostStats, setBoostStats] = useState<any>(null);
  const [refundBoosts, setRefundBoosts] = useState<any[]>([]);
  const [refundBoostsLoading, setRefundBoostsLoading] = useState(false);
  const [supportItems, setSupportItems] = useState<any[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportPage, setSupportPage] = useState(1);
  const [supportHasMore, setSupportHasMore] = useState(false);

  const ensureAuthForLoadMore = useCallback(() => {
    if (currentUser) return true;
    redirectToLogin("/moderation");
    return false;
  }, [currentUser]);

  const loadData = useCallback(async (currentTab: string, p = 1, currentSubTab: "contents" | "comments" | "profiles" | "reports" | "ads" | "copyright_claims" | "support" = "contents", append = false) => {
    if (append) setLoadMoreLoading(true); else setLoading(true);
    try {
      let apiTab = currentTab;
      if (currentTab === "review") {
        apiTab = currentSubTab === 'contents' ? 'flagged_posts' : currentSubTab === 'comments' ? 'flagged_comments' : currentSubTab === 'reports' ? 'reports' : 'moderation_users';
      } else if (currentTab === "payments") {
        apiTab = 'withdrawals';
      }
      const res = await fetch(`/api/admin/moderation?tab=${apiTab}&page=${p}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();

      let newItems: any[] = [];
      if (currentTab === "review") {
        if (currentSubTab === 'contents') newItems = data.posts || [];
        else if (currentSubTab === 'comments') newItems = data.comments || [];
        else if (currentSubTab === 'reports') newItems = data.reports || [];
        else newItems = data.users || [];
      } else if (currentTab === "payments") {
        newItems = data.withdrawals || [];
      }

      setTotal(data.total || 0);
      setHasMore(newItems.length >= 10);
      if (append) {
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }
    } catch (err) { logClientError('[Moderation] loadData error:', err); } finally { setLoading(false); setLoadMoreLoading(false); }
  }, []);

  const loadSupportRequests = useCallback(async (kind: "moderation_appeal" | "bug_report", p = 1, append = false) => {
    if (append) setLoadMoreLoading(true); else setSupportLoading(true);
    try {
      const res = await fetch(`/api/admin/support-requests?status=active&kind=${kind}&page=${p}&_ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      const requests = data.requests || [];
      setSupportHasMore((data.total || 0) > p * 10);
      if (append) {
        setSupportItems(prev => [...prev, ...requests]);
      } else {
        setSupportItems(requests);
      }
    } catch (err) {
      logClientError("[Moderation] loadSupportRequests error:", err);
      if (!append) setSupportItems([]);
    } finally {
      setSupportLoading(false);
      setLoadMoreLoading(false);
    }
  }, []);

  // Fetch moderator assignment on mount
  useEffect(() => {
    if (isAdmin) { setAssignmentLoaded(true); return; }
    fetch(`/api/admin/moderation?tab=my_assignment&_ts=${Date.now()}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        const a = data.assignment || null;
        setModerationAssignment(a);
        setModerationCountry(data.country || null);
        // Set default tab to match assignment
        if (a && a !== 'management' && a !== 'review') {
          setTab(a as typeof tab);
        }
        setAssignmentLoaded(true);
      })
      .catch(() => {
        // Fetch failed — keep assignment null, still allow loading (backend enforces access)
        setAssignmentLoaded(true);
      });
  }, [isAdmin]);

  useEffect(() => {
    if (!assignmentLoaded) return;
    if (tab === 'applications') return;
    if (tab === 'panel') return;
    if (tab === 'payments' && paySubTab !== 'withdrawals') return;
    if (tab === 'review' && (subTab === 'reports' || subTab === 'ads' || subTab === 'copyright_claims' || subTab === 'support')) return;
    loadData(tab, page, subTab);
  }, [tab, page, subTab, paySubTab, loadData, assignmentLoaded]);

  // Stats dashboard: load fixed stats when panel stats sub-tab opens
  useEffect(() => {
    if (!(tab === 'panel' && panelTab === 'stats')) return;
    setStatsLoading(true);
    fetch(`/api/admin/stats/dashboard?_ts=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setStatsFixed(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [tab, panelTab]);

  const runStatsQuery = async () => {
    if (selectedMetrics.length === 0) return;
    setQueryLoading(true);
    try {
      const res = await fetch(`/api/admin/stats/dashboard?metrics=${selectedMetrics.join(",")}&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setQueryResults(data.queryResults || {});
    } catch {} finally { setQueryLoading(false); }
  };

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const loadModerators = useCallback(async () => {
    setModeratorsLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?tab=moderators&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setModerators(data.moderators || []);
    } catch {} finally { setModeratorsLoading(false); }
  }, []);

  const loadPanel = useCallback(async (t: "recent_users" | "recent_posts" | "recent_comments" | "reports", q?: string) => {
    setPanelLoading(true);
    try {
      const trimmed = (q || "").trim();
      const queryParam = trimmed.length >= 2 ? `&q=${encodeURIComponent(trimmed)}` : "";
      const limitParam = t === "reports" ? "" : "&limit=30";
      const res = await fetch(`/api/admin/moderation?tab=${t}${queryParam}${limitParam}&_ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      if (t === "recent_users") {
        setPanelUsers(data.users || []);
      } else if (t === "recent_posts") {
        setPanelPosts(data.posts || []);
      } else if (t === "recent_comments") {
        setPanelComments(data.comments || []);
      } else {
        setPanelReports(data.reports || []);
      }
    } catch {} finally { setPanelLoading(false); }
  }, []);

  useEffect(() => {
    if (!assignmentLoaded) return;
    if (panelTab === "moderators") {
      loadModerators();
      return;
    }
    if (panelTab === "stats") return;
    const q = panelTab === "recent_users" ? panelUserQuery : panelTab === "recent_posts" ? panelPostQuery : panelCommentQuery;
    const t = setTimeout(() => {
      loadPanel(panelTab, q);
    }, 300);
    return () => clearTimeout(t);
  }, [panelTab, panelUserQuery, panelPostQuery, panelCommentQuery, loadPanel, loadModerators, assignmentLoaded]);

  // Load reports when review/reports sub-tab is active
  useEffect(() => {
    if (!assignmentLoaded) return;
    if (tab === 'review' && subTab === 'reports') {
      loadPanel("reports");
    }
  }, [tab, subTab, loadPanel, assignmentLoaded]);

  useEffect(() => {
    if (!assignmentLoaded) return;
    if (tab === "review" && subTab === "support") {
      loadSupportRequests(supportSubTab === "appeals" ? "moderation_appeal" : "bug_report", supportPage);
    }
  }, [tab, subTab, supportSubTab, supportPage, loadSupportRequests, assignmentLoaded]);

  useEffect(() => {
    if (tab !== "panel") return;
    fetch("/api/admin/site-settings/ads")
      .then(r => r.json())
      .then(data => {
        setAdsEnabled(!!data.enabled);
        setAdsFeed(!!data.feed);
        setAdsMoments(!!data.moments);
        setAdsVideo(!!data.videoPostroll);
        setAdsPostDetail(!!data.postDetail);
      })
      .catch(() => {});
  }, [tab]);

  const takeAction = async (action: string, targetType: string, targetId: string, reason?: string) => {
    setActionLoading(targetId);
    // Pre-check: block actions on content with active boosts
    const boostCheckActions = ['ban_user', 'delete_user', 'moderation_user', 'reject_content', 'remove_post', 'dismiss_content'];
    if (boostCheckActions.includes(action)) {
      try {
        const checkType = (targetType === 'user') ? 'user' : 'post';
        const res = await fetch(`/api/admin/moderation?tab=check_boosts&target_type=${checkType}&target_id=${targetId}`);
        const data = await res.json();
        if (data.activeBoosts > 0) {
          feedimAlert("error", t("activeBoostsWarning", { count: data.activeBoosts }));
          setActionLoading(null);
          return;
        }
      } catch {}
    }

    // Optimistic: remove card + duplicates (same author + title for posts, same author + content for comments)
    const idKey = targetType === 'user' ? 'user_id' : 'id';
    const targetItem = items.find((item: any) => String(item[idKey]) === String(targetId));
    let removedCount = 1;
    setItems(prev => {
      let next = prev;
      if (targetType === 'post' && targetItem) {
        const authorUsername = targetItem.author?.username;
        const title = targetItem.title;
        next = prev.filter((item: any) => !(item.author?.username === authorUsername && item.title === title));
      } else if (targetType === 'comment' && targetItem) {
        const authorId = targetItem.author_id;
        const content = targetItem.content;
        next = prev.filter((item: any) => !(item.author_id === authorId && item.content === content));
      } else {
        next = prev.filter((item: any) => String(item[idKey]) !== String(targetId));
      }
      removedCount = prev.length - next.length;
      return next;
    });
    setTotal(prev => Math.max(0, prev - removedCount));

    // API call in background
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, target_type: targetType, target_id: targetId, reason }),
      });
      if (!res.ok) {
        feedimAlert("error", t("actionFailed"));
        loadData(tab, 1, subTab);
      }
    } catch {
      feedimAlert("error", t("actionFailed"));
      loadData(tab, 1, subTab);
    } finally {
      setActionLoading(null);
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
      if (!res.ok) { setScanError(data.error || t("error")); return; }
      setScanResults(data.results || []);
      if ((data.results || []).length === 0) setScanError(t("noSimilarContent"));
    } catch { setScanError(t("requestFailed")); } finally { setScanLoading(false); }
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
        feedimAlert('error', t("actionFailed"));
        loadCopyrightClaims(1);
      }
    } catch {
      feedimAlert('error', t("actionFailed"));
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
        feedimAlert('error', t("actionFailed"));
        loadCopyrightApps();
      }
    } catch {
      feedimAlert('error', t("actionFailed"));
      loadCopyrightApps();
    } finally { setAppActionLoading(null); }
  };

  const loadMonetizationApps = useCallback(async () => {
    setMonetizationAppsLoading(true);
    try {
      const res = await fetch(`/api/admin/moderation?tab=monetization_apps&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setMonetizationApps(data.applications || []);
    } catch {} finally { setMonetizationAppsLoading(false); }
  }, []);

  const takeMonetizationAction = async (action: 'approve_monetization' | 'reject_monetization', userId: string) => {
    setMonetizationActionLoading(userId);
    setMonetizationApps(prev => prev.filter(a => a.user_id !== userId));
    try {
      const res = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, target_type: 'user', target_id: userId }),
      });
      if (!res.ok) {
        feedimAlert('error', t("actionFailed"));
        loadMonetizationApps();
      }
    } catch {
      feedimAlert('error', t("actionFailed"));
      loadMonetizationApps();
    } finally { setMonetizationActionLoading(null); }
  };

  const loadBoosts = useCallback(async () => {
    setBoostsLoading(true);
    try {
      const res = await fetch(`/api/admin/boosts?_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setBoostItems(data.boosts || []);
    } catch {} finally { setBoostsLoading(false); }
  }, []);

  const loadRefundBoosts = useCallback(async () => {
    setRefundBoostsLoading(true);
    try {
      const res = await fetch(`/api/admin/boosts?view=refunds&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setRefundBoosts(data.boosts || []);
    } catch {} finally { setRefundBoostsLoading(false); }
  }, []);

  const loadAllBoosts = useCallback(async () => {
    setAllBoostsLoading(true);
    try {
      const res = await fetch(`/api/admin/boosts?view=all&_ts=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      setAllBoosts(data.boosts || []);
      setBoostStats(data.stats || null);
    } catch {} finally { setAllBoostsLoading(false); }
  }, []);

  const takeBoostAction = async (action: 'approve' | 'reject' | 'approve_refund' | 'reject_refund', boostId: number, reason?: string) => {
    setBoostActionLoading(boostId);
    if (action === 'approve_refund' || action === 'reject_refund') {
      setRefundBoosts(prev => prev.filter(b => b.id !== boostId));
    } else {
      setBoostItems(prev => prev.filter(b => b.id !== boostId));
    }
    try {
      const res = await fetch('/api/admin/boosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, boost_id: boostId, reason }),
      });
      if (!res.ok) {
        feedimAlert('error', t("actionFailed"));
        loadBoosts();
      }
    } catch {
      feedimAlert('error', t("actionFailed"));
      loadBoosts();
    } finally { setBoostActionLoading(null); }
  };

  useEffect(() => {
    if (!assignmentLoaded) return;
    if (tab === 'review' && subTab === 'copyright_claims') {
      setCopyrightClaimsPage(1);
      loadCopyrightClaims(1);
    }
    if (tab === 'applications' && appSubTab === 'copyright_apps') {
      loadCopyrightApps();
    }
    if (tab === 'applications' && appSubTab === 'monetization') {
      loadMonetizationApps();
    }
    if (tab === 'review' && subTab === 'ads') {
      loadBoosts();
    }
    if (tab === 'payments' && paySubTab === 'refunds') {
      loadRefundBoosts();
    }
    if (tab === 'panel' && panelTab === 'stats') {
      loadAllBoosts();
    }
  }, [tab, subTab, appSubTab, paySubTab, panelTab, loadCopyrightClaims, loadCopyrightApps, loadMonetizationApps, loadBoosts, loadRefundBoosts, loadAllBoosts, assignmentLoaded]);

  const allTabs = [
    { id: "review" as const, label: t("review"), icon: Shield },
    { id: "applications" as const, label: t("applications"), icon: FileText },
    { id: "payments" as const, label: t("paymentsTab"), icon: Wallet },
    { id: "panel" as const, label: t("management"), icon: ShieldCheck },
  ];

  const tabs = allTabs.filter(t => {
    if (isAdmin) return true;
    if (!moderationAssignment) return true;
    if (moderationAssignment === 'management') return true;
    return t.id === moderationAssignment;
  });

  const POST_APPROVE_KEYS = ['postApprove_appropriate', 'postApprove_falsePositive', 'postApprove_educational', 'postApprove_news', 'postApprove_entertainment', 'postApprove_creative'] as const;
  const POST_REJECT_KEYS = ['postReject_sexual', 'postReject_violence', 'postReject_hate', 'postReject_profanity', 'postReject_spam', 'postReject_copyright', 'postReject_misinfo', 'postReject_politics', 'postReject_drugs', 'postReject_selfHarm'] as const;
  const COMMENT_APPROVE_KEYS = ['commentApprove_appropriate', 'commentApprove_falsePositive', 'commentApprove_discussion', 'commentApprove_opinion'] as const;
  const COMMENT_REJECT_KEYS = ['commentReject_profanity', 'commentReject_hate', 'commentReject_threats', 'commentReject_spam', 'commentReject_sexual', 'commentReject_pii', 'commentReject_violence', 'commentReject_misinfo', 'commentReject_politics', 'commentReject_drugs', 'commentReject_selfHarm', 'commentReject_fraud'] as const;
  const PROFILE_APPROVE_KEYS = ['profileApprove_appropriate', 'profileApprove_falsePositive', 'profileApprove_normal', 'profileApprove_creator', 'profileApprove_business', 'profileApprove_parody'] as const;
  const PROFILE_REJECT_KEYS = ['profileReject_avatar', 'profileReject_username', 'profileReject_bio', 'profileReject_impersonation', 'profileReject_bot', 'profileReject_spam', 'profileReject_multiAccount', 'profileReject_redirect', 'profileReject_hate', 'profileReject_fraud', 'profileReject_minorRisk', 'profileReject_banEvasion'] as const;
  const CLAIM_REJECT_KEYS = ['claimReject_noProof', 'claimReject_insufficientEvidence', 'claimReject_copiedContent', 'claimReject_misleading', 'claimReject_lowSimilarity', 'claimReject_differentWork', 'claimReject_publicDomain', 'claimReject_fairUse'] as const;
  const COPYRIGHT_APP_REJECT_KEYS = ['copyrightAppReject_noOriginal', 'copyrightAppReject_insufficientProof', 'copyrightAppReject_lowScore', 'copyrightAppReject_newAccount', 'copyrightAppReject_spamHistory', 'copyrightAppReject_fakeInfo'] as const;

  return (
    <AppLayout headerTitle="Moderation" hideRightSidebar>
      <div className="pb-10">
        {/* Moderator info */}
        {!isAdmin && (moderationAssignment || moderationCountry) && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-[0.72rem] text-text-muted">
            {moderationAssignment && (
              <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-primary font-medium">
                {moderationAssignment === 'review' ? t("review") : moderationAssignment === 'applications' ? t("applications") : moderationAssignment === 'payments' ? t("paymentsTab") : t("management")}
              </span>
            )}
            {moderationCountry && (
              <span className="px-2 py-0.5 rounded-full bg-bg-tertiary text-text-primary font-medium">
                {getCountryName(moderationCountry)}
              </span>
            )}
          </div>
        )}
        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 py-3 z-10 overflow-x-auto scrollbar-hide">
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
          <div className="space-y-0">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-border-primary/30">
                <div className="h-10 w-10 rounded-lg bg-bg-secondary animate-pulse shrink-0" />
                <div className="flex-1 space-y-[6px]">
                  <div className="h-[10px] w-[60%] bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[8px] w-[40%] bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
                <div className="h-8 w-16 bg-bg-secondary rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        ) : tab === "panel" ? (
          <div className="px-4 space-y-3 py-2">
            {isAdmin && (
              <div className="bg-bg-secondary rounded-[13px] p-4 space-y-3">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Shield className="h-4 w-4" /> {t("adsSettings")}
                </h3>
                {/* Master toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{t("ads")}</span>
                    <p className="text-xs text-text-muted mt-0.5">{t("adsDesc")}</p>
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
                          body: JSON.stringify({ enabled: next, feed: next ? adsFeed : false, moments: next ? adsMoments : false, videoPostroll: next ? adsVideo : false, postDetail: next ? adsPostDetail : false }),
                        });
                        document.documentElement.dataset.adsEnabled = next ? "1" : "0";
                        if (!next) {
                          setAdsFeed(false); setAdsMoments(false); setAdsVideo(false); setAdsPostDetail(false);
                          document.documentElement.dataset.adsFeed = "0";
                          document.documentElement.dataset.adsMoments = "0";
                          document.documentElement.dataset.adsVideo = "0";
                          document.documentElement.dataset.adsPostDetail = "0";
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
                {/* Area toggles — only visible when master is on */}
                {adsEnabled && (
                  <div className="space-y-2.5 pt-1 border-t border-bg-tertiary">
                    {([
                      { key: "feed" as const, label: t("adsFeed"), desc: t("adsFeedDesc"), value: adsFeed, setter: setAdsFeed, attr: "adsFeed" },
                      { key: "moments" as const, label: t("adsMoments"), desc: t("adsMomentsDesc"), value: adsMoments, setter: setAdsMoments, attr: "adsMoments" },
                      { key: "videoPostroll" as const, label: t("adsVideoPostroll"), desc: t("adsVideoPostrollDesc"), value: adsVideo, setter: setAdsVideo, attr: "adsVideo" },
                      { key: "postDetail" as const, label: t("adsPostDetail"), desc: t("adsPostDetailDesc"), value: adsPostDetail, setter: setAdsPostDetail, attr: "adsPostDetail" },
                    ] as const).map(row => (
                      <div key={row.key} className="flex items-center justify-between">
                        <div>
                          <span className="text-[0.82rem] font-medium">{row.label}</span>
                          <p className="text-xs text-text-muted mt-0.5">{row.desc}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (adsLoading) return;
                            const next = !row.value;
                            row.setter(next);
                            setAdsLoading(true);
                            try {
                              await fetch("/api/admin/site-settings/ads", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ [row.key]: next }),
                              });
                              document.documentElement.dataset[row.attr] = next ? "1" : "0";
                            } catch {
                              row.setter(!next);
                            } finally {
                              setAdsLoading(false);
                            }
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                            row.value ? "bg-accent-main" : "bg-bg-tertiary"
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            row.value ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {isAdmin && (
                <button
                  onClick={() => setPanelTab("moderators")}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${
                    panelTab === "moderators" ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="inline-flex items-center leading-none h-4">{t("moderatorsTab")}</span>
                </button>
              )}
              {(["recent_users", "recent_posts", "recent_comments"] as const).map(pt => (
                <button
                  key={pt}
                  onClick={() => setPanelTab(pt)}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${
                    panelTab === pt ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="inline-flex items-center leading-none h-4">{pt === "recent_users" ? t("users") : pt === "recent_posts" ? t("contents") : t("comments")}</span>
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => setPanelTab("stats")}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${
                    panelTab === "stats" ? "bg-text-primary text-bg-primary" : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <span className="inline-flex items-center leading-none h-4">{t("stats")}</span>
                </button>
              )}
            </div>
            {panelTab !== "moderators" && panelTab !== "stats" && (
              <div>
                <input
                  type="text"
                  value={panelTab === "recent_users" ? panelUserQuery : panelTab === "recent_posts" ? panelPostQuery : panelCommentQuery}
                  onChange={e => panelTab === "recent_users" ? setPanelUserQuery(e.target.value) : panelTab === "recent_posts" ? setPanelPostQuery(e.target.value) : setPanelCommentQuery(e.target.value)}
                  placeholder={panelTab === "recent_users" ? t("searchUsers") : panelTab === "recent_posts" ? t("searchPosts") : t("searchComments")}
                  className="input-modern w-full !py-2 !text-[0.78rem]"
                />
              </div>
            )}
            {panelTab === "moderators" ? (
              moderatorsLoading ? (
                <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
              ) : moderators.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">{t("noModerators")}</div>
              ) : (
                <div className="divide-y divide-border-primary">
                  {moderators.map((m: any) => (
                    <div key={m.user_id} className="flex flex-col gap-2.5 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <LazyAvatar src={m.avatar_url} alt="" sizeClass="w-9 h-9" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[0.82rem] font-semibold truncate">{m.full_name || m.username}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                            <span>@{m.username}</span>
                            {m.moderation_country ? (
                              <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-accent-main/15 text-accent-main">
                                {getCountryName(m.moderation_country)}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-bg-tertiary text-text-muted">
                                {t("noDutyCountry")}
                              </span>
                            )}
                            {m.moderation_assignment ? (
                              <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-accent-main/15 text-accent-main">
                                {m.moderation_assignment === 'review' ? t("review") : m.moderation_assignment === 'applications' ? t("applications") : m.moderation_assignment === 'payments' ? t("paymentsTab") : t("management")}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[0.6rem] font-medium bg-bg-tertiary text-text-muted">
                                {t("noAssignment")}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            feedimAlert("question", t("confirmRemoveModerator"), {
                              showYesNo: true,
                              onYes: async () => {
                                setModerators(prev => prev.filter(mod => mod.user_id !== m.user_id));
                                try {
                                  const res = await fetch("/api/admin/moderation", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "remove_moderator", target_type: "user", target_id: m.user_id }),
                                  });
                                  if (res.ok) feedimAlert("success", t("moderatorRemoved"));
                                  else { feedimAlert("error", t("actionFailed")); loadModerators(); }
                                } catch { feedimAlert("error", t("actionFailed")); loadModerators(); }
                              },
                            });
                          }}
                          className="p-1.5 rounded-[8px] hover:bg-error/10 text-error transition shrink-0"
                          title={t("removeModerator")}
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pl-12">
                        <select
                          value={m.moderation_country || ""}
                          onChange={async (e) => {
                            const country = e.target.value || null;
                            setModerators(prev => prev.map(mod => mod.user_id === m.user_id ? { ...mod, moderation_country: country } : mod));
                            try {
                              const res = await fetch("/api/admin/moderation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "set_moderator_country", target_type: "user", target_id: m.user_id, country }),
                              });
                              if (res.ok) feedimAlert("success", t("countryUpdated"));
                              else { feedimAlert("error", t("actionFailed")); loadModerators(); }
                            } catch { feedimAlert("error", t("actionFailed")); loadModerators(); }
                          }}
                          className="text-[0.72rem] bg-bg-secondary border border-border-primary rounded-[8px] px-2 py-1 flex-1 min-w-0"
                        >
                          <option value="">{t("allCountries")}</option>
                          {COUNTRIES.map(c => (
                            <option key={c.code} value={c.code}>{c.name_tr}</option>
                          ))}
                        </select>
                        <select
                          value={m.moderation_assignment || ""}
                          onChange={async (e) => {
                            const assignment = e.target.value || null;
                            setModerators(prev => prev.map(mod => mod.user_id === m.user_id ? { ...mod, moderation_assignment: assignment } : mod));
                            try {
                              const res = await fetch("/api/admin/moderation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "set_moderator_assignment", target_type: "user", target_id: m.user_id, assignment }),
                              });
                              if (res.ok) feedimAlert("success", t("assignmentUpdated"));
                              else { feedimAlert("error", t("actionFailed")); loadModerators(); }
                            } catch { feedimAlert("error", t("actionFailed")); loadModerators(); }
                          }}
                          className="text-[0.72rem] bg-bg-secondary border border-border-primary rounded-[8px] px-2 py-1 flex-1 min-w-0"
                        >
                          <option value="">{t("noAssignment")}</option>
                          <option value="review">{t("review")}</option>
                          <option value="applications">{t("applications")}</option>
                          <option value="payments">{t("paymentsTab")}</option>
                          <option value="management">{t("management")}</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : panelLoading ? (
              <div className="flex items-center justify-center py-32"><span className="loader" style={{ width: 22, height: 22 }} /></div>
            ) : panelTab === "recent_users" ? (
              panelUsers.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">{t("noUsersFound")}</div>
              ) : (
                <div className="divide-y divide-border-primary">
                  {panelUsers.map((u: any) => (
                    <div key={u.user_id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition">
                      <Link href={`/u/${u.username}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <LazyAvatar src={u.avatar_url} alt="" sizeClass="w-8 h-8" />
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
                              "bg-accent-main/15 text-accent-main"
                            }`}>{u.status}</span>
                            {u.spam_score > 0 && <span className="text-error">S:{u.spam_score}</span>}
                          </div>
                        </div>
                        <span className="text-[0.65rem] text-text-muted shrink-0">
                          {new Date(u.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                        </span>
                      </Link>
                      {isAdmin && u.role !== 'admin' && u.role !== 'moderator' && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const res = await fetch("/api/admin/moderation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "make_moderator", target_type: "user", target_id: u.user_id }),
                              });
                              if (res.ok) {
                                feedimAlert("success", t("moderatorAdded"));
                                setPanelUsers(prev => prev.map(pu => pu.user_id === u.user_id ? { ...pu, role: 'moderator' } : pu));
                              } else feedimAlert("error", t("actionFailed"));
                            } catch { feedimAlert("error", t("actionFailed")); }
                          }}
                          className="p-1.5 rounded-[8px] hover:bg-accent-main/10 text-accent-main transition shrink-0"
                          title={t("makeModerator")}
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : panelTab === "recent_posts" ? (
              panelPosts.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">{t("noPostsFound")}</div>
              ) : (
                <div className="divide-y divide-border-primary">
                  {panelPosts.map((p: any) => {
                    const author = Array.isArray(p.author) ? p.author[0] : p.author;
                    return (
                      <Link
                        key={p.id}
                        href={`/${p.slug}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] font-semibold truncate">{p.title}</p>
                          <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                            <span>@{author?.username || "?"}</span>
                            <span className={`px-1 py-0.5 rounded text-[0.6rem] font-medium ${
                              p.status === "published" ? "bg-success/15 text-success" :
                              p.status === "moderation" ? "bg-accent-main/15 text-accent-main" :
                              p.status === "removed" ? "bg-error/15 text-error" :
                              "bg-bg-tertiary text-text-muted"
                            }`}>{p.status === "published" ? t("statusPublished") : p.status === "moderation" ? t("statusModeration") : p.status === "removed" ? t("statusRemoved") : p.status}</span>
                            {p.content_type === "video" && <span className="text-accent-main">{t("video")}</span>}
                            {p.content_type === "moment" && <span className="text-accent-main">{t("moment")}</span>}
                            <span>{p.view_count || 0}{t("viewsAbbr")} {p.like_count || 0}{t("likesAbbr")}</span>
                          </div>
                        </div>
                        <span className="text-[0.65rem] text-text-muted shrink-0">
                          {new Date(p.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : panelTab === "stats" ? (
              <div className="space-y-4">
                {statsLoading ? (
                  <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                ) : statsFixed ? (
                  <>
                    {/* Hero cards */}
                    <div className={`grid gap-2 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      <div className="bg-bg-secondary rounded-2xl p-4">
                        <p className="text-xs text-text-muted mb-1">{t("activeNow")}</p>
                        <p className="text-2xl font-bold">{(statsFixed.activeUsers || 0).toLocaleString(locale)}</p>
                      </div>
                      <div className="bg-bg-secondary rounded-2xl p-4">
                        <p className="text-xs text-text-muted mb-1">{t("premiumMembers")}</p>
                        <p className="text-2xl font-bold">{(statsFixed.premiumTotal || 0).toLocaleString(locale)}</p>
                        {statsFixed.premiumByPlan && Object.keys(statsFixed.premiumByPlan).length > 0 && (
                          <div className="mt-1.5 space-y-0.5">
                            {Object.entries(statsFixed.premiumByPlan).map(([plan, count]) => (
                              <p key={plan} className="text-xs text-text-muted capitalize">{plan}: {(count as number).toLocaleString(locale)}</p>
                            ))}
                          </div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="bg-bg-secondary rounded-2xl p-4">
                          <p className="text-xs text-text-muted mb-1">{t("coinRevenueHero")}</p>
                          <p className="text-2xl font-bold">₺{(statsFixed.coinRevenue || 0).toLocaleString(locale)}</p>
                        </div>
                      )}
                    </div>

                    {/* Metric groups */}
                    <div className="space-y-3">
                      {[
                        { label: t("usersGroup"), keys: ["totalUsers", "usersByStatus", "todayNewUsers", "verifiedUsers"] },
                        { label: t("contentGroup"), keys: ["totalPosts", "postsByType", "totalViews", "views30d", "totalComments", "todayComments", "flaggedComments", "removedComments"] },
                        { label: t("moderationGroup"), keys: ["moderatedPosts", "removedPosts", "approvedPosts", "moderatedAccounts", "blockedAccounts", "deletedAccounts"] },
                        ...(isAdmin ? [{ label: t("financeGroup"), keys: ["premiumRevenue", "coinRevenue", "todayCoinRevenue", "todayPurchasedCoins", "totalSpentCoins", "todaySpentCoins", "last30dPurchasedCoins", "last30dSpentCoins", "totalEarnedCoins", "totalWithdrawnCoins", "totalWithdrawals", "pendingWithdrawals"] }] : []),
                        { label: t("reportsGroup"), keys: ["totalReports", "pendingReports", "copyrightStrikes"] },
                      ].map(group => (
                        <div key={group.label}>
                          <p className="text-xs font-semibold text-text-muted mb-1.5">{group.label}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.keys.map(key => {
                              const selected = selectedMetrics.includes(key);
                              return (
                                <button
                                  key={key}
                                  onClick={() => toggleMetric(key)}
                                  className={`px-2.5 py-1 rounded-full text-[0.72rem] font-medium transition ${
                                    selected ? "bg-text-primary text-bg-primary" : "bg-bg-secondary text-text-muted hover:text-text-primary"
                                  }`}
                                >
                                  {t(`stat_${key}`)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Query button */}
                    <button
                      onClick={runStatsQuery}
                      disabled={selectedMetrics.length === 0 || queryLoading}
                      className="t-btn accept w-full disabled:opacity-50"
                    >
                      {queryLoading ? <span className="loader" style={{ width: 16, height: 16 }} /> : t("queryBtn")}
                    </button>

                    {/* Query results */}
                    {Object.keys(queryResults).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(queryResults).map(([key, value]) => (
                          <div key={key} className="bg-bg-secondary rounded-xl p-3">
                            <p className="text-xs text-text-muted mb-1">{t(`stat_${key}`)}</p>
                            {typeof value === "object" && value !== null ? (
                              <div className="space-y-0.5">
                                {Object.entries(value).map(([k, v]) => (
                                  <p key={k} className="text-sm font-medium">
                                    <span className="text-text-muted">{k}:</span> {(v as number).toLocaleString(locale)}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xl font-bold">
                                {(key === "premiumRevenue" || key === "coinRevenue" || key === "todayCoinRevenue") ? `₺${(value as number).toLocaleString(locale)}` : (value as number).toLocaleString(locale)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Ad stats & list — admin only */}
                    {isAdmin && <div className="space-y-4 mt-4">
                      {allBoostsLoading ? (
                        <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                      ) : (
                        <>
                          {boostStats && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-bg-secondary rounded-[15px] p-4"><p className="text-[0.72rem] text-text-muted font-medium">{tb("totalRevenue")}</p><p className="text-[1.2rem] font-bold text-success mt-1">₺{(boostStats.totalRevenue || 0).toLocaleString(locale)}</p></div>
                              <div className="bg-bg-secondary rounded-[15px] p-4"><p className="text-[0.72rem] text-text-muted font-medium">{tb("totalAds")}</p><p className="text-[1.2rem] font-bold mt-1">{boostStats.total || 0}</p></div>
                              <div className="bg-bg-secondary rounded-[15px] p-4"><p className="text-[0.72rem] text-text-muted font-medium">{tb("activeAds")}</p><p className="text-[1.2rem] font-bold text-accent-main mt-1">{boostStats.active || 0}</p></div>
                              <div className="bg-bg-secondary rounded-[15px] p-4"><p className="text-[0.72rem] text-text-muted font-medium">{tb("impressions")}</p><p className="text-[1.2rem] font-bold mt-1">{(boostStats.totalImpressions || 0).toLocaleString(locale)}</p></div>
                              <div className="bg-bg-secondary rounded-[15px] p-4"><p className="text-[0.72rem] text-text-muted font-medium">{tb("pendingAds")}</p><p className="text-[1.2rem] font-bold text-accent-main mt-1">{boostStats.pending || 0}</p></div>
                              <div className="bg-bg-secondary rounded-[15px] p-4"><p className="text-[0.72rem] text-text-muted font-medium">{tb("clicks")}</p><p className="text-[1.2rem] font-bold mt-1">{(boostStats.totalClicks || 0).toLocaleString(locale)}</p></div>
                            </div>
                          )}
                          {allBoosts.length === 0 ? (
                            <div className="py-16 text-center text-text-muted text-sm">{tb("noAdsYet")}</div>
                          ) : (
                            <div className="space-y-2">
                              {allBoosts.map((boost: any) => {
                                const statusColors: Record<string, string> = {
                                  active: "bg-success/15 text-success", pending_review: "bg-accent-main/15 text-accent-main", awaiting_payment: "bg-info/15 text-info",
                                  completed: "bg-accent-main/15 text-accent-main", rejected: "bg-error/15 text-error", payment_failed: "bg-error/15 text-error",
                                  paused: "bg-bg-tertiary text-text-muted", refund_requested: "bg-accent-main/15 text-accent-main", refunded: "bg-bg-tertiary text-text-muted",
                                  cancelled: "bg-error/15 text-error",
                                };
                                const statusKey = boost.status === 'pending_review' ? 'pendingReview' : boost.status === 'awaiting_payment' ? 'awaitingPayment' : boost.status === 'payment_failed' ? 'paymentFailed' : boost.status === 'refund_requested' ? 'refundRequested' : boost.status;
                                return (
                                  <div key={boost.id} className="bg-bg-secondary rounded-[15px] p-4">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <LazyAvatar src={boost.author?.avatar_url} alt="" sizeClass="w-8 h-8" />
                                        <div>
                                          <p className="text-[0.82rem] font-medium">{boost.author?.full_name || boost.author?.username}</p>
                                          <p className="text-[0.68rem] text-text-muted">@{boost.author?.username}</p>
                                        </div>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-semibold ${statusColors[boost.status] || "bg-bg-tertiary text-text-muted"}`}>{tb(statusKey as any)}</span>
                                    </div>
                                    <p className="text-[0.82rem] font-semibold mb-1 truncate">{boost.post?.title || `Post #${boost.post_id}`}</p>
                                    {boost.goal && <p className="text-[0.68rem] text-accent-main font-medium mb-1">{tb((`goal${boost.goal.charAt(0).toUpperCase()}${boost.goal.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`) as any)}</p>}
                                    <div className="flex items-center justify-between text-[0.72rem] text-text-muted">
                                      <span>₺{boost.total_budget} · {tb("days", { count: boost.duration_days })}</span>
                                      <span>{tb("impressions")}: {(boost.impressions || 0).toLocaleString(locale)} · {tb("clicks")}: {boost.clicks || 0}</span>
                                    </div>
                                    {boost.starts_at && <p className="text-[0.65rem] text-text-muted mt-1">{new Date(boost.starts_at).toLocaleDateString(locale)} — {boost.ends_at ? new Date(boost.ends_at).toLocaleDateString(locale) : "–"}</p>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>}
                  </>
                ) : null}
              </div>
            ) : (
              panelComments.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">{t("noPendingComments")}</div>
              ) : (
                <div className="divide-y divide-border-primary">
                  {panelComments.map((c: any) => {
                    const author = Array.isArray(c.author) ? c.author[0] : c.author;
                    return (
                      <Link
                        key={c.id}
                        href={c.post_slug ? `/${c.post_slug}` : "#"}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition"
                      >
                        <LazyAvatar src={author?.avatar_url} alt="" sizeClass="w-8 h-8" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.82rem] line-clamp-1">{c.content || (c.gif_url ? "GIF" : "–")}</p>
                          <div className="flex items-center gap-2 text-[0.68rem] text-text-muted">
                            <span>@{author?.username || "?"}</span>
                            {c.post_title && <span className="truncate max-w-[120px]">{c.post_title}</span>}
                            <span className={`px-1 py-0.5 rounded text-[0.6rem] font-medium ${
                              c.status === "approved" ? "bg-success/15 text-success" :
                              c.status === "removed" ? "bg-error/15 text-error" :
                              "bg-accent-main/15 text-accent-main"
                            }`}>{c.status}</span>
                          </div>
                        </div>
                        <span className="text-[0.65rem] text-text-muted shrink-0">
                          {new Date(c.created_at).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )
            )}
          </div>
        ) : tab === "review" ? (
          <div className="px-4 space-y-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1">
          {(['contents','comments','profiles','support',...(isAdmin ? ['ads'] as const : []),'copyright_claims','reports'] as const).map(s => (
            <button key={s} onClick={() => {
              setSubTab(s as typeof subTab);
              setPage(1);
              if (s === "support") setSupportPage(1);
            }}
              className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold whitespace-nowrap shrink-0 ${subTab===s?'bg-text-primary text-bg-primary':'text-text-muted hover:text-text-primary'}`}
            >{s==='contents'?t("contents"):s==='comments'?t("comments"):s==='profiles'?t("profiles"):s==='support'?t("support"):s==='ads'?t("ads"):s==='copyright_claims'?t("copyrightClaims"):t("reports")}</button>
          ))}
          <button onClick={() => {
            if (subTab === 'ads') loadBoosts();
            else if (subTab === 'copyright_claims') { setCopyrightClaimsPage(1); loadCopyrightClaims(1); }
            else if (subTab === 'reports') loadPanel("reports");
            else if (subTab === 'support') { setSupportPage(1); loadSupportRequests(supportSubTab === "appeals" ? "moderation_appeal" : "bug_report", 1); }
            else loadData('review', 1, subTab);
          }} className="ml-auto px-3 py-1.5 rounded-full text-[0.78rem] font-semibold bg-bg-secondary hover:bg-bg-tertiary shrink-0">{t("refresh")}</button>
        </div>

            {subTab === 'contents' ? (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">{t("noPendingPosts")}</div>
            ) : items.map((p: any, idx: number) => (
              <div key={`post-${p.id}-${idx}`} className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">{t((p.content_type || "post") as any)}</span>
                      {(p.author?.language || p.author?.country) && (
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                          {[p.author?.language, p.author?.country && getCountryName(p.author.country, p.author.language)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {p.moderation_category && (
                        <span className={`px-1.5 py-0.5 text-[0.6rem] font-bold rounded inline-flex items-center gap-1 ${
                          p.moderation_category === 'copyright' ? 'bg-accent-main/20 text-accent-main' : 'bg-accent-main/15 text-accent-main'
                        }`}>
                          {p.moderation_category === 'copyright' && <Copyright className="h-3 w-3" />}
                          {t(`cat_${p.moderation_category}` as any) || p.moderation_category}
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
                        <LazyAvatar src={p.author.avatar_url} alt="" sizeClass="w-4 h-4" />
                      )}
                      <p className="text-[0.72rem] text-text-muted">
                        @{p.author?.username || "—"}
                      </p>
                    </div>
                    {p.ai_reason && (
                      <p className="text-[0.72rem] text-accent-main mt-1.5">{t("reason")}: {p.ai_reason.replace(/\s*\([A-Za-z]+=[\d.]+\)/g, '').replace(/\s*[A-Za-z]+=[\d.]+(?:,\s*[A-Za-z]+=[\d.]+)*/g, '').trim()}</p>
                    )}
                    {p.copyright_match && p.copyright_similarity && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[0.68rem] text-accent-main font-medium">%{p.copyright_similarity} {t("similarity")}</span>
                        <Link
                          href={`/${p.copyright_match.slug}`}
                          target="_blank"
                          className="text-[0.68rem] text-accent-main hover:underline"
                        >
                          {t("originalPost")} (@{p.copyright_match.author_username}) &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <Link href={`/${p.slug}`} target="_blank"
                      className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                    ><Eye className="h-3.5 w-3.5" />{t("viewContent")}</Link>
                  </div>
                </div>
                {/* Approve reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {POST_APPROVE_KEYS.map(k => {
                    const label = t(k as any);
                    const selected = (postReasons[p.id] || []).includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setPostReasons(prev => {
                          const cur = prev[p.id] || [];
                          const cleaned = cur.filter(x => (POST_APPROVE_KEYS as readonly string[]).includes(x));
                          const next = selected ? cleaned.filter(x => x !== k) : [...cleaned, k];
                          return { ...prev, [p.id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/20'}`}
                      >{label}</button>
                    );
                  })}
                </div>
                {/* Reject reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {POST_REJECT_KEYS.map(k => {
                    const label = t(k as any);
                    const selected = (postReasons[p.id] || []).includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setPostReasons(prev => {
                          const cur = prev[p.id] || [];
                          const cleaned = cur.filter(x => (POST_REJECT_KEYS as readonly string[]).includes(x));
                          const next = selected ? cleaned.filter(x => x !== k) : [...cleaned, k];
                          return { ...prev, [p.id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                      >{label}</button>
                    );
                  })}
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={150}
                    value={customReasons[String(p.id)] || ''}
                    onChange={e => setCustomReasons(prev => ({ ...prev, [String(p.id)]: e.target.value }))}
                    placeholder={t("customReasonPlaceholder")}
                    className="input-modern w-full !py-2 !text-[0.78rem] mt-2"
                  />
                  <span className="text-[0.65rem] text-text-muted">{(customReasons[String(p.id)] || '').length}/150</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const reasons = (postReasons[p.id] || []).filter(r => (POST_APPROVE_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[String(p.id)] || '').trim();
                      const fullReason = [...reasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      requireCaptcha(() => takeAction("approve_content", "post", p.id, fullReason));
                    }}
                    disabled={actionLoading === String(p.id)}
                    className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("publishContent")}</button>
                  <button
                    onClick={() => {
                      const presetReasons = (postReasons[p.id] || []).filter(r => (POST_REJECT_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[String(p.id)] || '').trim();
                      const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      requireCaptcha(() => takeAction("reject_content", "post", p.id, fullReason));
                    }}
                    disabled={actionLoading === String(p.id)}
                    className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("removeContent")}</button>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => {
                    if (!ensureAuthForLoadMore()) return;
                    const next = page + 1;
                    setPage(next);
                    loadData(tab, next, subTab, true);
                  }}
                  disabled={loadMoreLoading}
                  className="px-4 py-2 rounded-[8px] text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                >{loadMoreLoading ? t("loading") : t("loadMore")}</button>
              </div>
            )}
          </div>
            ) : subTab === 'profiles' ? (
          <div className="px-4 space-y-2 py-2">
            {/* Profile sub-tabs */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {(['moderation','blocked','deleted'] as const).map(s => (
                <button key={s} onClick={() => setProfileSubTab(s)}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold whitespace-nowrap shrink-0 ${profileSubTab===s?'bg-text-primary text-bg-primary':'text-text-muted hover:text-text-primary'}`}
                >{s==='moderation'?t("profileModeration"):s==='blocked'?t("profileBlocked"):t("profileDeleted")}</button>
              ))}
            </div>
            {(() => {
              const filtered = items.filter(u => {
                if (profileSubTab === 'moderation') return u.status === 'moderation';
                if (profileSubTab === 'blocked') return u.status === 'blocked';
                return u.status === 'deleted';
              });
              return filtered.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-sm">
                  {profileSubTab === 'moderation' ? t("noAccountsUnderReview") : profileSubTab === 'blocked' ? t("noBlockedAccounts") : t("noDeletedAccounts")}
                </div>
              ) : filtered.map((u: any, idx: number) => {
              const isBlocked = u.status === 'blocked';
              const isDeleted = u.status === 'deleted';
              const remainingDays = isDeleted && u.updated_at ? Math.max(0, 14 - Math.floor((Date.now() - new Date(u.updated_at).getTime()) / (1000 * 60 * 60 * 24))) : 0;
              const statusLabel = isDeleted ? t("statusDeleted", { days: remainingDays }) : isBlocked ? t("statusBlocked") : t("statusUnderReview");
              return (
              <div key={`${u.user_id || u.username || 'spam-user'}-${idx}`} className="bg-bg-secondary rounded-[15px] p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">{t("profile")}</span>
                      {(u.language || u.country) && (
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                          {[u.language, u.country && getCountryName(u.country, u.language)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <span className={`px-1.5 py-0.5 text-[0.6rem] font-bold rounded ${(isDeleted || isBlocked) ? 'bg-error/15 text-error' : 'bg-accent-main/15 text-accent-main'}`}>{statusLabel}</span>
                      <span className="text-[0.65rem] text-text-muted">{formatRelativeDate(u.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <LazyAvatar src={u.avatar_url} alt="" sizeClass="w-10 h-10" />
                      <div>
                        <p className="text-[0.82rem] font-medium">{u.full_name || u.username}</p>
                        <p className="text-[0.72rem] text-text-muted">@{u.username}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <Link href={`/u/${u.username}`} target="_blank" className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />{t("viewAccount")}</Link>
                  </div>
                </div>
                {u.moderation_reason && (
                  <p className="text-[0.72rem] text-accent-main mt-1.5">{t("reason")}: {u.moderation_reason.replace(/\s*\([A-Za-z]+=[\d.]+\)/g, '').replace(/\s*[A-Za-z]+=[\d.]+(?:,\s*[A-Za-z]+=[\d.]+)*/g, '').trim()}</p>
                )}
                {/* Action buttons — approve for moderation/blocked, activate for deleted */}
                {(isBlocked || isDeleted) ? (
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => requireCaptcha(() => takeAction("activate_user", "user", u.user_id, t("accountReactivated")))}
                      disabled={actionLoading === u.user_id}
                      className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                    >{t("activateAccount")}</button>
                  </div>
                ) : (
                <>
                {/* Approve reasons */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {PROFILE_APPROVE_KEYS.map(k => {
                    const label = t(k as any);
                    const selected = (userReasons[u.user_id] || []).includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setUserReasons(prev => {
                          const cur = prev[u.user_id] || [];
                          const cleaned = cur.filter(x => (PROFILE_APPROVE_KEYS as readonly string[]).includes(x));
                          const next = selected ? cleaned.filter(x => x !== k) : [...cleaned, k];
                          return { ...prev, [u.user_id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/20'}`}
                      >{label}</button>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    onClick={() => {
                      const reasons = (userReasons[u.user_id] || []).filter(r => (PROFILE_APPROVE_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[u.user_id] || '').trim();
                      const fullReason = [...reasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      requireCaptcha(() => takeAction("activate_user", "user", u.user_id, fullReason));
                    }}
                    disabled={actionLoading === u.user_id}
                    className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("activateAccount")}</button>
                </div>
                {/* Reject reasons */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PROFILE_REJECT_KEYS.map(k => {
                    const label = t(k as any);
                    const selected = (userReasons[u.user_id] || []).includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setUserReasons(prev => {
                          const cur = prev[u.user_id] || [];
                          const cleaned = cur.filter(x => (PROFILE_REJECT_KEYS as readonly string[]).includes(x));
                          const next = selected ? cleaned.filter(x => x !== k) : [...cleaned, k];
                          return { ...prev, [u.user_id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                      >{label}</button>
                    );
                  })}
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    maxLength={150}
                    value={customReasons[u.user_id] || ''}
                    onChange={e => setCustomReasons(prev => ({ ...prev, [u.user_id]: e.target.value }))}
                    placeholder={t("customReasonPlaceholder")}
                    className="input-modern w-full !py-2 !text-[0.78rem]"
                  />
                  <span className="text-[0.65rem] text-text-muted">{(customReasons[u.user_id] || '').length}/150</span>
                </div>
                <div className="flex justify-end gap-2 mt-1.5">
                  <button
                    onClick={() => {
                      const presetReasons = (userReasons[u.user_id] || []).filter(r => (PROFILE_REJECT_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[u.user_id] || '').trim();
                      const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      feedimAlert("question", t("confirmCloseAccount", { username: u.username }), {
                        showYesNo: true,
                        onYes: () => requireCaptcha(() => takeAction("ban_user", "user", u.user_id, fullReason)),
                      });
                    }}
                    disabled={actionLoading === u.user_id}
                    className="px-3 py-1.5 rounded-[8px] bg-accent-main/10 text-accent-main hover:bg-accent-main/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("closeAccount")}</button>
                  <button
                    onClick={() => {
                      const presetReasons = (userReasons[u.user_id] || []).filter(r => (PROFILE_REJECT_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[u.user_id] || '').trim();
                      const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      feedimAlert("question", t("confirmDeleteAccount", { username: u.username }), {
                        showYesNo: true,
                        onYes: () => requireCaptcha(() => takeAction("delete_user", "user", u.user_id, fullReason)),
                      });
                    }}
                    disabled={actionLoading === u.user_id}
                    className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("deleteAccount")}</button>
                </div>
                </>
                )}
              </div>
              );
            });
            })()}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => {
                    if (!ensureAuthForLoadMore()) return;
                    const next = page + 1;
                    setPage(next);
                    loadData(tab, next, subTab, true);
                  }}
                  disabled={loadMoreLoading}
                  className="px-4 py-2 rounded-[8px] text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                >{loadMoreLoading ? t("loading") : t("loadMore")}</button>
              </div>
            )}
          </div>
            ) : subTab === 'support' ? (
          <div className="px-4 space-y-2 py-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {(['appeals', 'general'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => {
                    setSupportSubTab(s);
                    setSupportPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold whitespace-nowrap shrink-0 ${supportSubTab===s?'bg-text-primary text-bg-primary':'text-text-muted hover:text-text-primary'}`}
                >
                  {s === "appeals" ? t("appeals") : t("generalSupport")}
                </button>
              ))}
            </div>
            {supportLoading ? (
              <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
            ) : supportItems.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">{t("noPendingSupportRequests")}</div>
            ) : (
              <>
                {supportItems.map((request: any) => (
                  <ModerationSupportLinkCard
                    key={request.id}
                    request={request}
                    locale={locale}
                    currentModeratorId={currentUser?.id || null}
                    labels={{
                      appeals: t("appeals"),
                      generalSupport: t("generalSupport"),
                      supportRequester: t("supportRequester"),
                      openSupportRequest: t("openSupportRequest"),
                      takeSupportRequest: t("takeSupportRequest"),
                      supportAssignedToYou: t("supportAssignedToYou"),
                      supportClaimSuccess: t("supportClaimSuccess"),
                      supportClaimError: t("supportClaimError"),
                      supportClaimLimit: t("supportClaimLimit"),
                    }}
                  />
                ))}
                {supportHasMore && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={() => {
                        if (!ensureAuthForLoadMore()) return;
                        const next = supportPage + 1;
                        setSupportPage(next);
                        loadSupportRequests(supportSubTab === "appeals" ? "moderation_appeal" : "bug_report", next, true);
                      }}
                      disabled={loadMoreLoading}
                      className="px-4 py-2 rounded-[8px] text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                    >
                      {loadMoreLoading ? t("loading") : t("loadMore")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
            ) : subTab === 'reports' ? (
          <div className="px-4 space-y-2 py-2">
            {panelLoading ? (
              <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
            ) : panelReports.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">{t("noPendingReports")}</div>
            ) : (
              <div className="space-y-2">
                {panelReports.map((r: any) => {
                  const reporter = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
                  const contentAuthor = Array.isArray(r.content_author) ? r.content_author[0] : r.content_author;
                  const reasonLabel = t(`reason_${r.reason}` as any) || r.reason;
                  const typeLabel = r.content_type === 'post' ? t("post") : r.content_type === 'comment' ? t("comment") : t("profile");
                  // Parse copyright description JSON
                  let reportDesc = r.description || '';
                  let copyrightOriginalUrl = '';
                  let copyrightCopyUrl = '';
                  if (r.reason === 'copyright' && reportDesc) {
                    try {
                      const parsed = JSON.parse(reportDesc);
                      copyrightOriginalUrl = parsed.original_url || '';
                      copyrightCopyUrl = parsed.copy_url || '';
                      reportDesc = parsed.copyright_description || '';
                    } catch {}
                  }
                  // View link — always provide a link for all report types
                  const viewHref = r.content_type === 'post' && r.content_slug ? `/${r.content_slug}` :
                    r.content_type === 'comment' && r.content_slug ? `/${r.content_slug}` :
                    contentAuthor?.username ? `/u/${contentAuthor.username}` :
                    r.comment_author_username ? `/u/${r.comment_author_username}` : null;
                  return (
                    <div key={r.id} className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-1.5 py-0.5 text-[0.6rem] font-bold rounded bg-accent-main/20 text-accent-main">{r.post_content_type ? t((r.post_content_type) as any) : typeLabel}</span>
                            {(reporter?.language || reporter?.country) && (
                              <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                                {[reporter?.language, reporter?.country && getCountryName(reporter.country, reporter.language)].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 text-[0.6rem] font-bold rounded inline-flex items-center gap-1 bg-accent-main/15 text-accent-main">
                              {r.reason === 'copyright' && <Copyright className="h-3 w-3" />}
                              {reasonLabel}
                            </span>
                            <span className="text-[0.65rem] text-text-muted">{formatRelativeDate(r.created_at)}</span>
                          </div>
                          {r.content_type === 'post' && r.content_title && (
                            <p className="text-[0.82rem] font-medium line-clamp-2">{r.content_title}</p>
                          )}
                          {r.content_type === 'comment' && r.comment_text && (
                            <p className="text-[0.78rem] text-text-muted line-clamp-2">{r.comment_text}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-[0.68rem] text-text-muted">
                            <div className="flex items-center gap-1.5">
                              {reporter?.avatar_url && <LazyAvatar src={reporter.avatar_url} alt="" sizeClass="w-4 h-4" />}
                              <span>{t("reporter")}: @{reporter?.username || "?"}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {contentAuthor?.avatar_url && <LazyAvatar src={contentAuthor.avatar_url} alt="" sizeClass="w-4 h-4" />}
                              <span>{t("target")}: @{contentAuthor?.username || "?"}</span>
                            </div>
                          </div>
                          {reportDesc && <p className="text-[0.72rem] text-text-muted mt-1.5 line-clamp-2">{reportDesc}</p>}
                          {(copyrightOriginalUrl || copyrightCopyUrl) && (
                            <div className="mt-1.5 space-y-0.5">
                              {copyrightOriginalUrl && (
                                <div>
                                  <span className="text-[0.65rem] text-text-muted">{t("copyrightOriginal")}: </span>
                                  <a href={copyrightOriginalUrl} target="_blank" rel="noopener noreferrer" className="text-[0.68rem] text-accent-main hover:underline break-all">{copyrightOriginalUrl}</a>
                                </div>
                              )}
                              {copyrightCopyUrl && (
                                <div>
                                  <span className="text-[0.65rem] text-text-muted">{t("copyrightCopy")}: </span>
                                  <a href={copyrightCopyUrl} target="_blank" rel="noopener noreferrer" className="text-[0.68rem] text-accent-main hover:underline break-all">{copyrightCopyUrl}</a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {viewHref && (
                          <div className="shrink-0 ml-3">
                            <Link href={viewHref} target="_blank"
                              className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                            ><Eye className="h-3.5 w-3.5" />{t("viewContent")}</Link>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => requireCaptcha(async () => {
                            const snapshot = panelReports;
                            setPanelReports(prev => prev.filter(x => !(x.content_type === r.content_type && (r.content_type === 'user' ? x.content_author_id === r.content_author_id : x.content_id === r.content_id))));
                            try {
                              const res = await fetch("/api/admin/moderation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "resolve_report", target_type: "report", target_id: String(r.id), reason: reasonLabel }),
                              });
                              if (!res.ok) { feedimAlert("error", t("actionFailed")); setPanelReports(snapshot); }
                            } catch { feedimAlert("error", t("actionFailed")); setPanelReports(snapshot); }
                          })}
                          className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                        >{t("resolveReport")}</button>
                        <button
                          onClick={() => requireCaptcha(async () => {
                            const snapshot = panelReports;
                            setPanelReports(prev => prev.filter(x => !(x.content_type === r.content_type && (r.content_type === 'user' ? x.content_author_id === r.content_author_id : x.content_id === r.content_id))));
                            try {
                              const res = await fetch("/api/admin/moderation", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "dismiss_report", target_type: "report", target_id: String(r.id) }),
                              });
                              if (!res.ok) { feedimAlert("error", t("actionFailed")); setPanelReports(snapshot); }
                            } catch { feedimAlert("error", t("actionFailed")); setPanelReports(snapshot); }
                          })}
                          className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                        >{t("dismissReport")}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            ) : subTab === 'ads' && isAdmin ? (
          <div className="px-4 space-y-2 py-2">
            {boostsLoading ? (
              <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
            ) : boostItems.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">{t("noPendingBoosts")}</div>
            ) : boostItems.map((boost: any) => (
              <div key={boost.id} className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">{tb("ad")}</span>
                      {(boost.author?.language || boost.author?.country) && (
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                          {[boost.author?.language, boost.author?.country && getCountryName(boost.author.country, boost.author.language)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <span className="text-[0.65rem] text-text-muted">{formatRelativeDate(boost.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 mt-1">
                      <LazyAvatar src={boost.author?.avatar_url} alt="" sizeClass="w-8 h-8" />
                      <div>
                        <p className="text-[0.82rem] font-medium">{boost.author?.full_name || boost.author?.username}</p>
                        <p className="text-[0.68rem] text-text-muted">@{boost.author?.username}</p>
                      </div>
                    </div>
                    <p className="text-[0.82rem] font-semibold mb-1.5 truncate">{boost.post?.title || `Post #${boost.post_id}`}</p>
                    {boost.boost_code && <p className="text-[0.68rem] text-text-muted font-mono mb-1">{tb("boostCode")}: {boost.boost_code}</p>}
                    {boost.goal && <p className="text-[0.68rem] text-accent-main font-medium mb-1">{tb((`goal${boost.goal.charAt(0).toUpperCase()}${boost.goal.slice(1).replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())}`) as any)}</p>}
                    <div className="text-[0.72rem] text-text-muted space-y-0.5">
                      <p>
                        {boost.target_countries?.length > 0 ? boost.target_countries.join(", ") : tb("allCountries")}
                        {" | "}{boost.target_gender === "all" ? tb("allGenders") : boost.target_gender === "male" ? tb("male") : tb("female")}
                        {(boost.age_min || boost.age_max) ? ` | ${boost.age_min || "–"}–${boost.age_max || "–"}` : ""}
                      </p>
                      <p className="font-semibold text-text-primary">₺{boost.daily_budget}{tb("perDay")} × {tb("days", { count: boost.duration_days })} = ₺{boost.total_budget}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    {boost.post?.slug && (
                      <Link href={`/${boost.post.slug}`} target="_blank" className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />{tb("viewAd")}</Link>
                    )}
                  </div>
                </div>
                {/* Reject reasons */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {[tb("inappropriateContent"), tb("misleadingAd"), tb("copyrightViolation"), tb("communityViolation"), tb("spamContent"), tb("violenceContent"), tb("nsfwContent"), tb("politicalContent")].map(reason => (
                    <button
                      key={reason}
                      onClick={() => setBoostRejectReasons(prev => {
                        const curr = prev[boost.id] || [];
                        return { ...prev, [boost.id]: curr.includes(reason) ? curr.filter((r: string) => r !== reason) : [...curr, reason] };
                      })}
                      className={`px-2 py-0.5 rounded-full text-[0.65rem] font-medium transition ${(boostRejectReasons[boost.id] || []).includes(reason) ? "bg-error/15 text-error" : "bg-bg-tertiary text-text-muted hover:text-text-primary"}`}
                    >{reason}</button>
                  ))}
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={150}
                    value={customReasons[`boost-${boost.id}`] || ''}
                    onChange={e => setCustomReasons(prev => ({ ...prev, [`boost-${boost.id}`]: e.target.value }))}
                    placeholder={t("customReasonPlaceholder")}
                    className="input-modern w-full !py-2 !text-[0.78rem]"
                  />
                  <span className="text-[0.65rem] text-text-muted">{(customReasons[`boost-${boost.id}`] || '').length}/150</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => {
                    const custom = (customReasons[`boost-${boost.id}`] || '').trim();
                    const reason = custom || tb("adApproved");
                    requireCaptcha(() => takeBoostAction("approve", boost.id, reason));
                  }} disabled={boostActionLoading === boost.id} className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap">{tb("startAd")}</button>
                  <button onClick={() => {
                    const presetReasons = boostRejectReasons[boost.id] || [];
                    const custom = (customReasons[`boost-${boost.id}`] || '').trim();
                    const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                    if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                    requireCaptcha(() => takeBoostAction("reject", boost.id, fullReason));
                  }} disabled={boostActionLoading === boost.id} className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap">{tb("rejectAd")}</button>
                </div>
              </div>
            ))}
          </div>
            ) : subTab === 'copyright_claims' ? (
              <div className="space-y-2">
                {/* Copyright scan tool */}
                <div className="px-4 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Copyright className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                      <input
                        type="text"
                        value={scanSlug}
                        onChange={e => setScanSlug(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && runCopyrightScan()}
                        placeholder={t("copyrightScanPlaceholder")}
                        className="input-modern w-full !py-2 !pl-9 !text-[0.78rem]"
                      />
                    </div>
                    <button
                      onClick={runCopyrightScan}
                      disabled={scanLoading || !scanSlug.trim()}
                      className="px-3 py-2 rounded-[8px] text-[0.78rem] font-medium bg-accent-main/15 text-accent-main hover:bg-accent-main/25 disabled:opacity-50 transition whitespace-nowrap"
                    >{scanLoading ? t("scanning") : t("scan")}</button>
                  </div>
                  {scanError && !scanResults.length && (
                    <p className="text-[0.72rem] text-text-muted mt-2">{scanError}</p>
                  )}
                  {scanResults.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {scanResults.map((r: any) => (
                        <Link
                          key={r.post_id}
                          href={`/${r.slug}`}
                          target="_blank"
                          className={`flex items-center justify-between px-3 py-2 rounded-[8px] text-[0.78rem] transition ${
                            r.similarity >= 60 ? 'bg-accent-main/10 hover:bg-accent-main/20' : 'bg-bg-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{r.title}</p>
                            <p className="text-[0.68rem] text-text-muted">@{r.author}</p>
                          </div>
                          <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[0.68rem] font-bold ${
                            r.similarity >= 95 ? 'bg-error/20 text-error' :
                            r.similarity >= 80 ? 'bg-accent-main/20 text-accent-main' :
                            r.similarity >= 60 ? 'bg-accent-main/15 text-accent-main' :
                            'bg-bg-tertiary text-text-muted'
                          }`}>%{r.similarity}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                {copyrightClaimsLoading ? (
                  <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                ) : copyrightClaims.length === 0 ? (
                  <div className="py-16 text-center text-text-muted text-sm">{t("noPendingCopyrightClaims")}</div>
                ) : (
                <>
                {copyrightClaims.map((claim: any) => {
                  const post = Array.isArray(claim.post) ? claim.post[0] : claim.post;
                  const claimant = Array.isArray(claim.claimant) ? claim.claimant[0] : claim.claimant;
                  const matchedPost = Array.isArray(claim.matched_post) ? claim.matched_post[0] : claim.matched_post;
                  const matchedAuthor = Array.isArray(claim.matched_author) ? claim.matched_author[0] : claim.matched_author;
                  // Parse proof_description: may be JSON (legacy) or plain text
                  let proofText = '';
                  let proofOriginalUrl = '';
                  let proofCopyUrl = '';
                  if (claim.proof_description) {
                    try {
                      const parsed = JSON.parse(claim.proof_description);
                      proofOriginalUrl = parsed.original_url || '';
                      proofCopyUrl = parsed.copy_url || '';
                      proofText = parsed.copyright_description || '';
                    } catch {
                      proofText = claim.proof_description;
                    }
                  }
                  const hasProof = !!(proofText || proofOriginalUrl || proofCopyUrl || claim.proof_urls?.length);
                  return (
                    <div key={claim.id} className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded inline-flex items-center gap-1">
                              <Copyright className="h-3 w-3" />{t("copyrightBadge")}
                            </span>
                            <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                              {t((claim.content_type || post?.content_type || "post") as any)}
                            </span>
                            {(claimant?.language || claimant?.country) && (
                              <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                                {[claimant?.language, claimant?.country && getCountryName(claimant.country, claimant.language)].filter(Boolean).join(' · ')}
                              </span>
                            )}
                            {claim.similarity_percent && (
                              <span className={`px-1.5 py-0.5 text-[0.6rem] font-bold rounded ${
                                claim.similarity_percent >= 90 ? 'bg-error/20 text-error' : 'bg-accent-main/20 text-accent-main'
                              }`}>%{claim.similarity_percent}</span>
                            )}
                            {hasProof && (
                              <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-success/20 text-success rounded">{t("hasProof")}</span>
                            )}
                          </div>
                          <p className="text-[0.82rem] font-medium line-clamp-2">{post?.title || t("contentNotFound")}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {claimant?.avatar_url && (
                              <LazyAvatar src={claimant.avatar_url} alt="" sizeClass="w-4 h-4" />
                            )}
                            <p className="text-[0.72rem] text-text-muted">
                              {t("claimantLabel")}: @{claimant?.username || "—"} ({claim.owner_name || "—"})
                            </p>
                          </div>
                          {matchedPost && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[0.68rem] text-text-muted">{t("matchedLabel")}:</span>
                              <Link
                                href={`/${matchedPost.slug}`}
                                target="_blank"
                                className="text-[0.68rem] text-accent-main hover:underline truncate"
                              >
                                {matchedPost.title} (@{matchedAuthor?.username || "?"}) &rarr;
                              </Link>
                            </div>
                          )}
                          {hasProof && (
                            <div className="mt-2 bg-bg-tertiary rounded-[8px] p-2.5">
                              {proofText && (
                                <>
                                  <p className="text-[0.68rem] font-medium text-text-muted mb-1">{t("descriptionLabel")}:</p>
                                  <p className="text-[0.72rem] text-text-primary line-clamp-3">{proofText}</p>
                                </>
                              )}
                              {proofOriginalUrl && (
                                <div className="mt-1">
                                  <span className="text-[0.65rem] text-text-muted">{t("copyrightOriginal")}: </span>
                                  <a href={proofOriginalUrl} target="_blank" rel="noopener noreferrer" className="text-[0.68rem] text-accent-main hover:underline break-all">{proofOriginalUrl}</a>
                                </div>
                              )}
                              {proofCopyUrl && (
                                <div className="mt-0.5">
                                  <span className="text-[0.65rem] text-text-muted">{t("copyrightCopy")}: </span>
                                  <a href={proofCopyUrl} target="_blank" rel="noopener noreferrer" className="text-[0.68rem] text-accent-main hover:underline break-all">{proofCopyUrl}</a>
                                </div>
                              )}
                              {claim.proof_urls?.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  <p className="text-[0.65rem] text-text-muted">{t("proofUrlLabel")}:</p>
                                  {claim.proof_urls.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                      className="text-[0.68rem] text-accent-main hover:underline block truncate">
                                      {url}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {claim.owner_email && (
                                <p className="text-[0.65rem] text-text-muted mt-1">{t("emailLabel")}: {claim.owner_email}</p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1.5 shrink-0 ml-3">
                          {post?.slug && (
                            <Link href={`/${post.slug}`} target="_blank"
                              className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                            ><Eye className="h-3.5 w-3.5" />{t("viewContent")}</Link>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CLAIM_REJECT_KEYS.map(k => {
                          const label = t(k as any);
                          const selected = (claimRejectReasons[claim.id] || []).includes(k);
                          return (
                            <button
                              key={k}
                              onClick={() => setClaimRejectReasons(prev => {
                                const cur = prev[claim.id] || [];
                                const next = selected ? cur.filter(x => x !== k) : [...cur, k];
                                return { ...prev, [claim.id]: next };
                              })}
                              className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                            >{label}</button>
                          );
                        })}
                      </div>
                      <div>
                        <input
                          type="text"
                          maxLength={150}
                          value={claimCustomReasons[claim.id] || ''}
                          onChange={e => setClaimCustomReasons(prev => ({ ...prev, [claim.id]: e.target.value }))}
                          placeholder={t("customReasonPlaceholder")}
                          className="input-modern w-full !py-2 !text-[0.78rem] mt-2"
                        />
                        <span className="text-[0.65rem] text-text-muted">{(claimCustomReasons[claim.id] || '').length}/150</span>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            const custom = (claimCustomReasons[claim.id] || '').trim();
                            requireCaptcha(() => takeCopyrightAction('verify', claim.id, custom || t("copyrightVerified")));
                          }}
                          disabled={claimActionLoading === claim.id}
                          className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                        >{t("verifyCopyright")}</button>
                        <button
                          onClick={() => {
                            const presetReasons = (claimRejectReasons[claim.id] || []).map(k => t(k as any));
                            const custom = (claimCustomReasons[claim.id] || '').trim();
                            const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                            if (!fullReason) return feedimAlert('error', t("selectAtLeastOneReason"));
                            requireCaptcha(() => takeCopyrightAction('reject', claim.id, fullReason));
                          }}
                          disabled={claimActionLoading === claim.id}
                          className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                        >{t("rejectAndRemove")}</button>
                      </div>
                    </div>
                  );
                })}
                {copyrightClaimsHasMore && (
                  <div className="flex justify-center py-3">
                    <button
                      onClick={() => {
                        if (!ensureAuthForLoadMore()) return;
                        const next = copyrightClaimsPage + 1;
                        setCopyrightClaimsPage(next);
                        loadCopyrightClaims(next, true);
                      }}
                      disabled={copyrightClaimsLoading}
                      className="px-4 py-2 rounded-[8px] text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                    >{copyrightClaimsLoading ? t("loading") : t("loadMore")}</button>
                  </div>
                )}
                </>
                )}
              </div>
            ) : (
          <div className="px-4 space-y-2 py-2">
            {items.length === 0 ? (
              <div className="py-16 text-center text-text-muted text-sm">{t("noPendingComments")}</div>
            ) : items.map((c: any, idx: number) => (
              <div key={`comment-${c.id}-${idx}`} className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">{t("comment")}</span>
                      {(c.author?.language || c.author?.country) && (
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold bg-accent-main/20 text-accent-main rounded">
                          {[c.author?.language, c.author?.country && getCountryName(c.author.country, c.author.language)].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {c.moderation_category && (
                        <span className="px-1.5 py-0.5 text-[0.6rem] font-bold rounded inline-flex items-center gap-1 bg-accent-main/15 text-accent-main">
                          {t(`cat_${c.moderation_category}` as any) || c.moderation_category}
                        </span>
                      )}
                      <span className="text-[0.65rem] text-text-muted">{formatRelativeDate(c.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <LazyAvatar src={c.author?.avatar_url} alt="" sizeClass="w-5 h-5" />
                      <span className="text-[0.72rem] text-text-muted truncate max-w-[60%]">@{c.author?.username || '—'}</span>
                    </div>
                    <p className="text-[0.78rem] text-text-primary whitespace-pre-wrap break-words line-clamp-3">{c.content || c.gif_url || ''}</p>
                    {c.moderation_reason && (
                      <p className="text-[0.72rem] text-accent-main mt-1.5">{t("reason")}: {c.moderation_reason.replace(/\s*\([A-Za-z]+=[\d.]+\)/g, '').replace(/\s*[A-Za-z]+=[\d.]+(?:,\s*[A-Za-z]+=[\d.]+)*/g, '').trim()}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 ml-3">
                    <Link href={c.post_slug ? `/${c.post_slug}` : "#"} target="_blank"
                      className="px-3 py-1.5 rounded-[8px] bg-text-muted/10 text-text-muted hover:bg-text-muted/20 transition text-[0.78rem] font-medium whitespace-nowrap inline-flex items-center gap-1.5"
                    ><Eye className="h-3.5 w-3.5" />{t("viewComment")}</Link>
                  </div>
                </div>
                {/* Approve reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMENT_APPROVE_KEYS.map(k => {
                    const label = t(k as any);
                    const selected = (commentReasons[c.id] || []).includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setCommentReasons(prev => {
                          const cur = prev[c.id] || [];
                          const cleaned = cur.filter(x => (COMMENT_APPROVE_KEYS as readonly string[]).includes(x));
                          const next = selected ? cleaned.filter(x => x !== k) : [...cleaned, k];
                          return { ...prev, [c.id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/20'}`}
                      >{label}</button>
                    );
                  })}
                </div>
                {/* Reject reasons */}
                <div className="flex flex-wrap gap-1.5">
                  {COMMENT_REJECT_KEYS.map(k => {
                    const label = t(k as any);
                    const selected = (commentReasons[c.id] || []).includes(k);
                    return (
                      <button
                        key={k}
                        onClick={() => setCommentReasons(prev => {
                          const cur = prev[c.id] || [];
                          const cleaned = cur.filter(x => (COMMENT_REJECT_KEYS as readonly string[]).includes(x));
                          const next = selected ? cleaned.filter(x => x !== k) : [...cleaned, k];
                          return { ...prev, [c.id]: next };
                        })}
                        className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                      >{label}</button>
                    );
                  })}
                </div>
                <div>
                  <input
                    type="text"
                    maxLength={150}
                    value={customReasons[String(c.id)] || ''}
                    onChange={e => setCustomReasons(prev => ({ ...prev, [String(c.id)]: e.target.value }))}
                    placeholder={t("customReasonPlaceholder")}
                    className="input-modern w-full !py-2 !text-[0.78rem] mt-2"
                  />
                  <span className="text-[0.65rem] text-text-muted">{(customReasons[String(c.id)] || '').length}/150</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const reasons = (commentReasons[c.id] || []).filter(r => (COMMENT_APPROVE_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[String(c.id)] || '').trim();
                      const fullReason = [...reasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      requireCaptcha(() => takeAction("approve_content", "comment", String(c.id), fullReason));
                    }}
                    disabled={actionLoading === String(c.id)}
                    className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("publishComment")}</button>
                  <button
                    onClick={() => {
                      const presetReasons = (commentReasons[c.id] || []).filter(r => (COMMENT_REJECT_KEYS as readonly string[]).includes(r)).map(k => t(k as any));
                      const custom = (customReasons[String(c.id)] || '').trim();
                      const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                      if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                      requireCaptcha(() => takeAction("reject_content", "comment", String(c.id), fullReason));
                    }}
                    disabled={actionLoading === String(c.id)}
                    className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium whitespace-nowrap"
                  >{t("removeComment")}</button>
                </div>
              </div>
            ))}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button
                  onClick={() => {
                    if (!ensureAuthForLoadMore()) return;
                    const next = page + 1;
                    setPage(next);
                    loadData(tab, next, subTab, true);
                  }}
                  disabled={loadMoreLoading}
                  className="px-4 py-2 rounded-[8px] text-[0.78rem] font-medium bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-60"
                >{loadMoreLoading ? t("loading") : t("loadMore")}</button>
              </div>
            )}
          </div>
            )}
          </div>
        ) : tab === "applications" ? (
          <div className="px-4 space-y-3 py-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {(['copyright_apps','monetization'] as const).map(s => (
                <button key={s} onClick={() => setAppSubTab(s)}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${appSubTab===s?'bg-text-primary text-bg-primary':'text-text-muted hover:text-text-primary'}`}
                >{s==='copyright_apps'?t("copyrightApps"):t("monetizationTab")}</button>
              ))}
            </div>
            {appSubTab === 'copyright_apps' ? (
              <div className="space-y-2">
                {copyrightAppsLoading ? (
                  <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                ) : copyrightApps.length === 0 ? (
                  <div className="py-16 text-center text-text-muted text-sm">{t("noPendingApplications")}</div>
                ) : copyrightApps.map((app: any) => {
                  const profile = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
                  return (
                    <div key={app.id} className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <LazyAvatar src={profile?.avatar_url} alt="" sizeClass="w-10 h-10" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.84rem] font-semibold truncate">{profile?.full_name || profile?.username || "?"}</p>
                          <div className="flex items-center gap-2 text-[0.7rem] text-text-muted">
                            <span>@{profile?.username || "?"}</span>
                            {profile?.profile_score !== undefined && (
                              <span className="px-1 py-0.5 rounded text-[0.6rem] font-medium bg-accent-main/15 text-accent-main">%{Math.round(profile.profile_score)}</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={`/u/${profile?.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 px-2.5 py-1.5 rounded-[8px] bg-bg-tertiary hover:bg-bg-primary transition text-[0.72rem] font-medium text-text-muted"
                        >{t("viewProfile")}</a>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.78rem]">
                        <div><span className="text-text-muted">{t("companyLabel")}:</span> <span className="font-medium">{app.company_name}</span></div>
                        <div><span className="text-text-muted">{t("emailLabel")}:</span> <span>{app.contact_email}</span></div>
                        {app.contact_phone && <div><span className="text-text-muted">{t("phoneLabel")}:</span> <span>{app.contact_phone}</span></div>}
                        {app.company_website && (
                          <div className="truncate">
                            <span className="text-text-muted">{t("webLabel")}:</span>{" "}
                            <a href={app.company_website} target="_blank" rel="noopener noreferrer" className="text-accent-main hover:underline">{app.company_website}</a>
                          </div>
                        )}
                      </div>

                      <div className="bg-bg-tertiary rounded-[8px] p-2.5">
                        <p className="text-[0.72rem] text-text-primary whitespace-pre-wrap">{app.description}</p>
                      </div>

                      {app.proof_urls?.length > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-[0.68rem] text-text-muted">{t("proofsLabel")}:</p>
                          {app.proof_urls.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="text-[0.68rem] text-accent-main hover:underline block truncate">{url}</a>
                          ))}
                        </div>
                      )}

                      {/* Reject reason chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {COPYRIGHT_APP_REJECT_KEYS.map(k => {
                          const label = t(k as any);
                          const selected = (copyrightAppReasons[app.id] || []).includes(k);
                          return (
                            <button
                              key={k}
                              onClick={() => setCopyrightAppReasons(prev => {
                                const cur = prev[app.id] || [];
                                const next = selected ? cur.filter(x => x !== k) : [...cur, k];
                                return { ...prev, [app.id]: next };
                              })}
                              className={`px-2 py-1 rounded-full text-[0.68rem] ${selected ? 'bg-text-primary text-bg-primary' : 'bg-bg-tertiary text-text-muted hover:text-text-primary'}`}
                            >{label}</button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        maxLength={150}
                        value={customReasons[`ca_${app.id}`] || ''}
                        onChange={e => setCustomReasons(prev => ({ ...prev, [`ca_${app.id}`]: e.target.value }))}
                        placeholder={t("customReasonPlaceholder")}
                        className="input-modern w-full !py-2 !text-[0.78rem]"
                      />

                      <div className="flex justify-end gap-2 pt-1 border-t border-border-primary/30">
                        <button
                          onClick={() => {
                            const custom = (customReasons[`ca_${app.id}`] || '').trim();
                            requireCaptcha(() => takeCopyrightAppAction('approve', app.id, custom || t("approved")));
                          }}
                          disabled={appActionLoading === app.id}
                          className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium"
                        >{t("approve")}</button>
                        <button
                          onClick={() => {
                            const presetReasons = (copyrightAppReasons[app.id] || []).map(k => t(k as any));
                            const custom = (customReasons[`ca_${app.id}`] || '').trim();
                            const fullReason = [...presetReasons, ...(custom ? [custom] : [])].join(', ');
                            if (!fullReason) return feedimAlert("error", t("selectAtLeastOneReason"));
                            requireCaptcha(() => takeCopyrightAppAction('reject', app.id, fullReason));
                          }}
                          disabled={appActionLoading === app.id}
                          className="px-3 py-1.5 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition text-[0.78rem] font-medium"
                        >{t("reject")}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {monetizationAppsLoading ? (
                  <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                ) : monetizationApps.length === 0 ? (
                  <div className="py-16 text-center text-text-muted text-sm">{t("noPendingMonetization")}</div>
                ) : monetizationApps.map((app: any) => (
                  <div key={app.user_id} className="bg-bg-secondary rounded-[15px] p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <LazyAvatar src={app.avatar_url} alt="" sizeClass="w-8 h-8" />
                          <div>
                            <p className="text-[0.82rem] font-medium">{app.full_name || app.username}</p>
                            <p className="text-[0.68rem] text-text-muted">@{app.username}</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[0.72rem]">
                          <div><span className="text-text-muted">{t("scoreLabel")}:</span> <span className="font-semibold">{Math.round((app.profile_score || 0) * 10) / 10}</span></div>
                          <div><span className="text-text-muted">{t("post")}:</span> <span className="font-semibold">{app.post_count || 0}</span></div>
                          <div><span className="text-text-muted">{t("spamLabel")}:</span> <span className="font-semibold">{app.spam_score || 0}</span></div>
                          <div><span className="text-text-muted">{t("dateLabel")}:</span> <span className="font-semibold">{app.monetization_applied_at ? formatRelativeDate(app.monetization_applied_at) : "-"}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-3">
                        <button
                          onClick={() => requireCaptcha(() => takeMonetizationAction("approve_monetization", app.user_id))}
                          disabled={monetizationActionLoading === app.user_id}
                          className="p-2 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition"
                          title={t("approveMonetization")}
                        ><Check className="h-4 w-4" /></button>
                        <button
                          onClick={() => requireCaptcha(() => takeMonetizationAction("reject_monetization", app.user_id))}
                          disabled={monetizationActionLoading === app.user_id}
                          className="p-2 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition"
                          title={t("rejectMonetization")}
                        ><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : tab === "payments" ? (
          <div className="px-4 space-y-3 py-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {(['withdrawals','refunds'] as const).map(s => (
                <button key={s} onClick={() => setPaySubTab(s)}
                  className={`px-3 py-1.5 rounded-full text-[0.78rem] font-semibold ${paySubTab===s?'bg-text-primary text-bg-primary':'text-text-muted hover:text-text-primary'}`}
                >{s==='withdrawals'?t("withdrawals"):t("refundsTab")}</button>
              ))}
            </div>
            {paySubTab === 'withdrawals' ? (
              <div className="space-y-2">
                {items.length === 0 ? (
                  <div className="py-16 text-center text-text-muted text-sm">{t("noPendingWithdrawals")}</div>
                ) : items.map((w: any) => (
                  <div key={w.id} className="bg-bg-secondary rounded-[15px] p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <LazyAvatar src={w.user?.avatar_url} alt="" sizeClass="w-8 h-8" />
                          <div>
                            <p className="text-[0.82rem] font-medium">{w.user?.full_name || w.user?.username}</p>
                            <p className="text-[0.68rem] text-text-muted">@{w.user?.username}</p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[0.72rem]">
                          <div><span className="text-text-muted">{t("amountLabel")}:</span> <span className="font-semibold">{w.amount} {t("tokenLabel")}</span></div>
                          <div><span className="text-text-muted">{t("currencyLabel")}:</span> <span className="font-semibold">{Number(w.amount_try).toFixed(2)} {t("currencyLabel")}</span></div>
                          <div className="col-span-2"><span className="text-text-muted">{t("ibanLabel")}:</span> <span className="font-mono text-[0.68rem]">{w.iban}</span></div>
                          <div className="col-span-2"><span className="text-text-muted">{t("accountHolder")}:</span> <span>{w.iban_holder}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-3">
                        <button
                          onClick={() => requireCaptcha(() => takeAction("approve_withdrawal", "withdrawal", w.id, t("approved")))}
                          disabled={actionLoading === String(w.id)}
                          className="p-2 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition"
                          title={t("approve")}
                        ><Check className="h-4 w-4" /></button>
                        <button
                          onClick={() => requireCaptcha(() => takeAction("reject_withdrawal", "withdrawal", w.id, t("withdrawalRejected")))}
                          disabled={actionLoading === String(w.id)}
                          className="p-2 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition"
                          title={t("reject")}
                        ><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {refundBoostsLoading ? (
                  <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
                ) : refundBoosts.length === 0 ? (
                  <div className="py-16 text-center text-text-muted text-sm">{t("noRefunds")}</div>
                ) : refundBoosts.map((boost: any) => (
                  <div key={boost.id} className="bg-bg-secondary rounded-[15px] p-4 border border-accent-main/30">
                    <div className="flex items-center gap-1.5 mb-2 text-accent-main text-[0.72rem] font-semibold">
                      <Wallet className="h-3.5 w-3.5" />
                      {tb("refundRequested")}
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <LazyAvatar src={boost.author?.avatar_url} alt="" sizeClass="w-8 h-8" />
                          <div>
                            <p className="text-[0.82rem] font-medium">{boost.author?.full_name || boost.author?.username}</p>
                            <p className="text-[0.68rem] text-text-muted">@{boost.author?.username}</p>
                          </div>
                        </div>
                        <p className="text-[0.82rem] font-semibold mb-1.5 truncate">{boost.post?.title || `Post #${boost.post_id}`}</p>
                        {boost.boost_code && <p className="text-[0.68rem] text-text-muted font-mono mb-1">{tb("boostCode")}: {boost.boost_code}</p>}
                        <p className="text-[0.72rem] text-text-muted font-semibold">₺{boost.daily_budget}{tb("perDay")} × {tb("days", { count: boost.duration_days })} = ₺{boost.total_budget}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-3">
                        <button onClick={() => requireCaptcha(() => takeBoostAction("approve_refund", boost.id, tb("refundApproved")))} disabled={boostActionLoading === boost.id} className="p-2 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition" title={tb("approveRefund")}><Check className="h-4 w-4" /></button>
                        <button onClick={() => requireCaptcha(() => takeBoostAction("reject_refund", boost.id, tb("refundRejected")))} disabled={boostActionLoading === boost.id} className="p-2 rounded-[8px] bg-error/10 text-error hover:bg-error/20 transition" title={tb("rejectRefund")}><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Load-more pagination is now embedded in each section */}
      </div>
      <PuzzleCaptcha open={captchaOpen} onClose={() => { setCaptchaOpen(false); pendingActionRef.current = null; }} onVerify={handleCaptchaVerify} />
    </AppLayout>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: any; label: string; value: number; color: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="bg-bg-secondary rounded-[15px] p-4 text-left hover:bg-bg-tertiary transition w-full">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-[0.72rem] text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </button>
  );
}
