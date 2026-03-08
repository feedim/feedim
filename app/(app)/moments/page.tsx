"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MomentCard from "@/components/MomentCard";
import BackButton from "@/components/BackButton";
import { useDashboardShell } from "@/components/DashboardShell";

import { useUser } from "@/components/UserContext";
import { useTranslations, useLocale } from "next-intl";
import { isBlockedContent } from "@/lib/blockedWords";
import { redirectToLogin } from "@/lib/loginNext";
import { feedimAlert } from "@/components/FeedimAlert";
import { smartBack } from "@/lib/smartBack";
import { Volume2, VolumeX } from "lucide-react";
import MomentAdCard from "@/components/MomentAdCard";
import { fetchWithCache, withCacheScope } from "@/lib/fetchWithCache";

type DisplayItem =
  | { type: "moment"; moment: Moment; realIndex: number }
  | { type: "ad"; adKey: number };

const CommentsModal = lazy(() => import("@/components/modals/CommentsModal"));
const ShareModal = lazy(() => import("@/components/modals/ShareModal"));
const PostMoreModal = lazy(() => import("@/components/modals/PostMoreModal"));
const LikesModal = lazy(() => import("@/components/modals/LikesModal"));
const preloadMomentsModals = () => {
  import("@/components/modals/CommentsModal");
  import("@/components/modals/ShareModal");
  import("@/components/modals/PostMoreModal");
};

interface Moment {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  video_url?: string;
  hls_url?: string;
  video_thumbnail?: string;
  featured_image?: string;
  video_duration?: number;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  save_count?: number;
  share_count?: number;
  profiles?: {
    user_id: string;
    username: string;
    full_name?: string;
    name?: string;
    surname?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
  post_tags?: { tags: { id: number; name: string; slug: string } }[];
  published_at?: string;
  sounds?: {
    id: number;
    title: string;
    artist?: string | null;
    audio_url: string;
    duration?: number | null;
    status: string;
    cover_image_url?: string | null;
    is_original?: boolean;
  } | null;
  visibility?: string;
}

interface MomentsPerfHints {
  constrained: boolean;
  warmupDelayMs: number;
  allowVideoPrefetch: boolean;
}

interface InteractionStatus {
  liked?: boolean;
  saved?: boolean;
}

interface InteractionResponse {
  interactions?: Record<string, InteractionStatus>;
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getMomentsPerfHints(): MomentsPerfHints {
  if (typeof window === "undefined") {
    return {
      constrained: true,
      warmupDelayMs: 800,
      allowVideoPrefetch: false,
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const saveData = !!nav.connection?.saveData;
  const effectiveType = nav.connection?.effectiveType || "";
  const lowMemory = (nav.deviceMemory ?? 8) <= 4;
  const lowCpu = (navigator.hardwareConcurrency || 8) <= 4;
  const slowNetwork = /(^|slow-)(2g|3g)$|^(2g|3g)$/.test(effectiveType);
  const constrained = coarsePointer || saveData || slowNetwork || lowMemory || lowCpu;

  return {
    constrained,
    warmupDelayMs: constrained ? 900 : 220,
    allowVideoPrefetch: !constrained,
  };
}

export default function MomentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <span className="loader" style={{ width: 32, height: 32 }} />
      </div>
    }>
      <MomentsContent />
    </Suspense>
  );
}

function MomentsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setMobileNavVisible } = useDashboardShell();
  const { isLoggedIn, user: ctxUser } = useUser();
  const locale = useLocale();
  const t = useTranslations("moments");
  const tErrors = useTranslations("errors");
  const tTooltip = useTranslations("tooltip");
  const momentsCacheScope = `${locale}:${ctxUser?.id || "guest"}`;
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeDisplayIndex, setActiveDisplayIndex] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [globalMuted, setGlobalMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const perfHintsRef = useRef<MomentsPerfHints>(getMomentsPerfHints());

  const getMomentsUrl = useCallback((excludeIds?: number[]) => (
    withCacheScope(`/api/posts/moments?limit=10${excludeIds?.length ? `&exclude=${excludeIds.join(",")}` : ""}&locale=${locale}&_t=${Date.now()}`, momentsCacheScope)
  ), [locale, momentsCacheScope]);

  // Idle detection — "Are you still watching?" after 15 min of no interaction
  const [idlePaused, setIdlePaused] = useState(false);
  const lastInteractionRef = useRef(0);
  const idleCheckRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    lastInteractionRef.current = Date.now();
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "wheel"] as const;
    const handler = () => { lastInteractionRef.current = Date.now(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true, capture: true }));

    idleCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= 15 * 60 * 1000) {
        setIdlePaused(true);
      }
    }, 30_000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handler, { capture: true } as EventListenerOptions));
      clearInterval(idleCheckRef.current);
    };
  }, []);

  const handleContinueWatching = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIdlePaused(false);
  }, []);

  const handleStopWatching = useCallback(() => {
    smartBack(router, "/dashboard");
  }, [router]);

  // Modal states
  const [commentModal, setCommentModal] = useState<{ postId: number; count: number; slug: string; allowComments?: boolean } | null>(null);
  const [shareModal, setShareModal] = useState<{ url: string; title: string; postId: number; slug: string } | null>(null);
  const [optionsModal, setOptionsModal] = useState<{ postId: number; slug: string; title: string; authorUsername?: string; authorUserId?: string; authorName?: string; authorRole?: string; visibility?: string } | null>(null);
  const [likesModalPostId, setLikesModalPostId] = useState<number | null>(null);

  const viewportHeightStyle = useMemo(
    () => ({ height: "100dvh", minHeight: "100svh" }),
    []
  );

  // Capture initial slug only on mount — ignore subsequent URL changes
  const [startSlug] = useState<string | null>(() => searchParams.get("s"));

  // Build display list — inject ad item every 7 moments
  const [seenAdKeys, setSeenAdKeys] = useState<Set<number>>(new Set());
  const seenAdKeysRef = useRef<Set<number>>(new Set());
  const displayItems = useMemo(() => {
    const filtered = moments.filter(m => !isBlockedContent(`${m.title || ""} ${m.excerpt || ""}`, m.profiles?.user_id, ctxUser?.id));
    const items: DisplayItem[] = [];
    filtered.forEach((m, i) => {
      items.push({ type: "moment" as const, moment: m, realIndex: i });
      if ((i + 1) % 7 === 0) {
        items.push({ type: "ad" as const, adKey: i });
      }
    });
    return items;
  }, [moments, ctxUser?.id]);

  const requireAuth = useCallback(() => {
    if (isLoggedIn) return true;
    redirectToLogin();
    return false;
  }, [isLoggedIn]);

  // Re-assert moments layout (guards against modal scroll lock resetting styles)
  const reassertLayout = useCallback(() => {
    const main = document.querySelector("main");
    const wrapper = main?.firstElementChild as HTMLElement | null;
    if (main) {
      main.style.paddingBottom = "0";
      main.style.overflow = "hidden";
      main.style.height = "100dvh";
      main.style.minHeight = "100svh";
    }
    if (wrapper) {
      wrapper.style.height = "100%";
      wrapper.style.overflow = "hidden";
    }
  }, []);

  // Hide mobile bottom nav + remove parent padding + prevent main scroll
  useEffect(() => {
    setMobileNavVisible(false);
    document.body.style.overflow = "hidden";
    reassertLayout();
    return () => {
      setMobileNavVisible(true);
      document.body.style.overflow = "";
      const main = document.querySelector("main");
      const wrapper = main?.firstElementChild as HTMLElement | null;
      if (main) {
        main.style.paddingBottom = "";
        main.style.overflow = "";
        main.style.height = "";
        main.style.minHeight = "";
      }
      if (wrapper) {
        wrapper.style.height = "";
        wrapper.style.overflow = "";
      }
    };
  }, [setMobileNavVisible, reassertLayout]);

  // Re-assert layout after any modal closes (prevents 100px gap from scroll lock cycle)
  useEffect(() => {
    if (!commentModal && !shareModal && !optionsModal && !likesModalPostId) {
      reassertLayout();
    }
  }, [commentModal, shareModal, optionsModal, likesModalPostId, reassertLayout]);

  // Preload modals early to avoid first-open lag
  useEffect(() => {
    if (typeof window === "undefined") return;
    const idleWindow = window as IdleWindow;
    let idleId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (idleWindow.requestIdleCallback && !perfHintsRef.current.constrained) {
      idleId = idleWindow.requestIdleCallback(preloadMomentsModals, {
        timeout: perfHintsRef.current.warmupDelayMs,
      });
    } else {
      timer = setTimeout(preloadMomentsModals, perfHintsRef.current.warmupDelayMs);
    }
    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timer) clearTimeout(timer);
    };
  }, []);
  // Set ambient light attribute for video mode
  useEffect(() => {
    document.documentElement.setAttribute("data-moments-active", "1");
    return () => document.documentElement.removeAttribute("data-moments-active");
  }, []);

  const loadMoments = useCallback(async (excludeIds?: number[]) => {
    try {
      const url = getMomentsUrl(excludeIds);
      const data = await fetchWithCache(url, { ttlSeconds: 0, forceRefresh: true }) as {
        moments?: Moment[];
        hasMore?: boolean;
      };
      return { moments: data.moments || [], hasMore: data.hasMore || false };
    } catch {
      return { moments: [], hasMore: false };
    }
  }, [getMomentsUrl]);

  const hydrateInteractions = useCallback((items: Moment[]) => {
    const idleWindow = window as IdleWindow;
    const ids = items.map((m: Moment) => m.id).slice(0, 50);
    if (ids.length === 0) return;

    const run = () => {
      fetch(`/api/posts/batch-interactions?ids=${ids.join(",")}`)
        .then(r => r.json())
        .then((d: InteractionResponse) => {
          if (d.interactions) {
            const liked = new Set<number>();
            const saved = new Set<number>();
            for (const [id, status] of Object.entries(d.interactions)) {
              if (status.liked) liked.add(Number(id));
              if (status.saved) saved.add(Number(id));
            }
            setLikedSet(prev => {
              const next = new Set(prev);
              liked.forEach(id => next.add(id));
              return next;
            });
            setSavedSet(prev => {
              const next = new Set(prev);
              saved.forEach(id => next.add(id));
              return next;
            });
          }
        })
        .catch(() => {});
    };

    if (idleWindow.requestIdleCallback && !perfHintsRef.current.constrained) {
      idleWindow.requestIdleCallback(run, { timeout: perfHintsRef.current.warmupDelayMs });
      return;
    }

    window.setTimeout(run, perfHintsRef.current.warmupDelayMs);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await loadMoments();
      let items = data.moments;

      if (startSlug) {
        const exists = items.find((m: Moment) => m.slug === startSlug);
        if (!exists) {
          try {
            const res = await fetch(`/api/posts/${startSlug}`);
            const postData = await res.json();
            if (res.ok && postData.post && postData.post.content_type === "moment") {
              const p = postData.post;
              const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
              items = [{ ...p, profiles: author }, ...items.filter((m: Moment) => m.id !== p.id)];
            }
          } catch {}
        } else {
          items = [exists, ...items.filter((m: Moment) => m.id !== exists.id)];
        }
      }

      setMoments(items);
      setHasMore(data.hasMore);
      setLoading(false);

      hydrateInteractions(items);
    })();
  }, [hydrateInteractions, loadMoments, startSlug]);

  // Preload first visible moment video for faster initial playback
  useEffect(() => {
    const first = moments[0];
    if (!first?.video_url) return;
    let preconnect: HTMLLinkElement | null = null;
    let dnsPrefetch: HTMLLinkElement | null = null;
    try {
      const origin = new URL(first.video_url).origin;
      preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = origin;
      preconnect.crossOrigin = "anonymous";
      dnsPrefetch = document.createElement("link");
      dnsPrefetch.rel = "dns-prefetch";
      dnsPrefetch.href = origin;
      document.head.appendChild(preconnect);
      document.head.appendChild(dnsPrefetch);
    } catch {}
    return () => {
      try { if (preconnect) document.head.removeChild(preconnect); } catch {}
      try { if (dnsPrefetch) document.head.removeChild(dnsPrefetch); } catch {}
    };
  }, [moments]);

  // Prefetch next 2 videos during idle time for smoother scrolling
  useEffect(() => {
    if (!perfHintsRef.current.allowVideoPrefetch) return;
    const links: HTMLLinkElement[] = [];
    for (let offset = 1; offset <= 2; offset++) {
      const idx = activeDisplayIndex + offset;
      const item = displayItems[idx];
      if (item?.type !== "moment" || !item.moment.video_url) continue;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "video";
      link.href = item.moment.video_url;
      document.head.appendChild(link);
      links.push(link);
    }
    return () => { links.forEach(l => { try { document.head.removeChild(l); } catch {} }); };
  }, [activeDisplayIndex, displayItems]);

  // IntersectionObserver
  useEffect(() => {
    if (displayItems.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) {
              setActiveDisplayIndex((prev) => (prev === idx ? prev : idx));
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    const cards = containerRef.current?.querySelectorAll("[data-index]");
    cards?.forEach((card) => observerRef.current?.observe(card));

    return () => observerRef.current?.disconnect();
  }, [displayItems]);

  // Update browser URL as user scrolls through moments (skip ad items)
  useEffect(() => {
    const item = displayItems[activeDisplayIndex];
    if (item?.type === "moment") {
      window.history.replaceState(null, "", `/moments?s=${item.moment.slug}`);
    }
  }, [activeDisplayIndex, displayItems]);

  // Track seen ad cards — prevents AdSense re-push on scroll back
  useEffect(() => {
    const item = displayItems[activeDisplayIndex];
    if (item?.type === "ad") {
      seenAdKeysRef.current.add(item.adKey);
    } else if (seenAdKeysRef.current.size > 0) {
      const seen = new Set(seenAdKeysRef.current);
      seenAdKeysRef.current = new Set();
      setSeenAdKeys(prev => {
        const next = new Set(prev);
        seen.forEach(k => next.add(k));
        return next;
      });
    }
  }, [activeDisplayIndex, displayItems]);

  // Infinite loading — guests redirected to login on loadMore
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    // Check proximity to end using the active item's real index
    const activeItem = displayItems[activeDisplayIndex];
    const realIdx = activeItem?.type === "moment" ? activeItem.realIndex :
      // For ad items, find the nearest preceding moment's realIndex
      (() => { for (let i = activeDisplayIndex - 1; i >= 0; i--) { const d = displayItems[i]; if (d?.type === "moment") return d.realIndex; } return moments.length - 1; })();
    if (realIdx >= moments.length - 2) {
      const run = async () => {
        if (!isLoggedIn) {
          redirectToLogin();
          return;
        }
        setLoadingMore(true);
        const data = await loadMoments(moments.map(m => m.id));
        const newMoments = data.moments as Moment[];
        setMoments(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          return [...prev, ...newMoments.filter(m => !existingIds.has(m.id))];
        });
        setHasMore(data.hasMore);
        setLoadingMore(false);
        hydrateInteractions(newMoments);
      };
      void run();
    }
  }, [activeDisplayIndex, displayItems, moments, hasMore, loadingMore, isLoggedIn, hydrateInteractions, loadMoments]);

  const handleLike = useCallback((momentId: number) => {
    if (!requireAuth()) return;
    const wasLiked = likedSet.has(momentId);
    setLikedSet(prev => {
      const next = new Set(prev);
      if (wasLiked) next.delete(momentId); else next.add(momentId);
      return next;
    });
    setMoments(prev => prev.map(m =>
      m.id === momentId ? { ...m, like_count: (m.like_count || 0) + (wasLiked ? -1 : 1) } : m
    ));
    fetch(`/api/posts/${momentId}/like`, { method: "POST", keepalive: true }).then(res => { if (!res.ok) throw res; }).catch(async (err) => {
      setLikedSet(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(momentId); else next.delete(momentId);
        return next;
      });
      setMoments(prev => prev.map(m =>
        m.id === momentId ? { ...m, like_count: (m.like_count || 0) + (wasLiked ? 1 : -1) } : m
      ));
      if (err instanceof Response && (err.status === 403 || err.status === 429)) {
        const data = await err.json().catch(() => ({}));
        feedimAlert("error", data.error || tErrors("likeLimitReached"));
      }
    });
  }, [likedSet, requireAuth, tErrors]);

  const handleSave = useCallback((momentId: number) => {
    if (!requireAuth()) return;
    const wasSaved = savedSet.has(momentId);
    setSavedSet(prev => {
      const next = new Set(prev);
      if (wasSaved) next.delete(momentId); else next.add(momentId);
      return next;
    });
    setMoments(prev => prev.map(m =>
      m.id === momentId ? { ...m, save_count: (m.save_count || 0) + (wasSaved ? -1 : 1) } : m
    ));
    fetch(`/api/posts/${momentId}/save`, { method: "POST", keepalive: true }).then(res => { if (!res.ok) throw res; }).catch(async (err) => {
      setSavedSet(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(momentId); else next.delete(momentId);
        return next;
      });
      setMoments(prev => prev.map(m =>
        m.id === momentId ? { ...m, save_count: (m.save_count || 0) + (wasSaved ? 1 : -1) } : m
      ));
      if (err instanceof Response && (err.status === 403 || err.status === 429)) {
        const data = await err.json().catch(() => ({}));
        feedimAlert("error", data.error || tErrors("saveLimitReached"));
      }
    });
  }, [savedSet, requireAuth, tErrors]);

  const handleComment = useCallback((moment: Moment) => {
    if (!requireAuth()) return;
    setCommentModal({ postId: moment.id, count: moment.comment_count || 0, slug: moment.slug });
  }, [requireAuth]);

  const handleLikesOpen = useCallback((momentId: number) => {
    setLikesModalPostId(momentId);
  }, []);

  const handleShare = useCallback((moment: Moment) => {
    setShareModal({
      url: `/moments?s=${moment.slug}`,
      title: moment.title,
      postId: moment.id,
      slug: moment.slug,
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setGlobalMuted(prev => !prev);
  }, []);

  const handleOptions = useCallback((moment: Moment) => {
    setOptionsModal({
      postId: moment.id,
      slug: moment.slug,
      title: moment.title,
      authorUsername: moment.profiles?.username,
      authorUserId: moment.profiles?.user_id,
      authorName: moment.profiles?.full_name || moment.profiles?.name || undefined,
      authorRole: moment.profiles?.role,
      visibility: moment.visibility || "public",
    });
  }, []);


  if (loading) {
    return (
      <div className="flex justify-center md:h-screen" style={{ height: "100dvh", minHeight: "100svh", backgroundColor: "#000" }}>
        <div className="w-full h-full bg-white/5 animate-pulse" style={{ maxWidth: "min(62vh, 480px)" }} />
      </div>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-text-primary">
        <p className="text-lg font-semibold mb-2">{t("noMoments")}</p>
        <p className="text-sm text-text-muted">{t("createFirst")}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center md:h-screen" style={viewportHeightStyle}>
      {/* Centered Reels column */}
      <div
        className="relative w-full h-full"
        style={{ maxWidth: "min(62vh, 480px)" }}
      >
        {/* Top bar — back button + Moments title + mute toggle */}
        <div className="absolute top-0 left-0 right-0 z-[60] flex items-center px-4 pt-4 pb-2 pointer-events-none">
          <BackButton variant="overlay" />
          <h1
            className="flex-1 text-center text-white text-[1.1rem] font-bold"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.2)" }}
          >
            {t("title")}
          </h1>
          <button
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
            aria-label={globalMuted ? tTooltip("unmute") : tTooltip("mute")}
          >
            {globalMuted
              ? <VolumeX className="h-5 w-5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
              : <Volume2 className="h-5 w-5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
            }
          </button>
        </div>

        {/* Scroll container */}
        <div
          ref={containerRef}
          className="h-full snap-y snap-mandatory scrollbar-hide overscroll-contain overflow-y-auto touch-pan-y"
          style={{ backgroundColor: "#000" }}
        >
      {displayItems.map((item, displayIndex) => {
        if (item.type === "ad") {
          return (
            <div key={`ad-${item.adKey}`} data-index={displayIndex} className="snap-start snap-always" style={viewportHeightStyle}>
              <MomentAdCard
                isActive={displayIndex === activeDisplayIndex && !seenAdKeys.has(item.adKey)}
                onSkip={() => {
                  const nextEl = containerRef.current?.querySelector(`[data-index="${displayIndex + 1}"]`);
                  if (nextEl) nextEl.scrollIntoView({ behavior: "smooth" });
                }}
              />
            </div>
          );
        }
        const distance = Math.abs(displayIndex - activeDisplayIndex);
        const preloadHint: "auto" | "metadata" = distance <= 2 ? "auto" : "metadata";
        return (
        <React.Fragment key={`m-${item.moment.id}`}>
          <div data-index={displayIndex} className="snap-start" style={viewportHeightStyle}>
                <MomentCard
                  moment={item.moment}
                  isActive={displayIndex === activeDisplayIndex && !idlePaused}
                  loadVideo={distance <= 5}
                  liked={likedSet.has(item.moment.id)}
                  saved={savedSet.has(item.moment.id)}
                  muted={globalMuted}
                  onToggleMute={handleToggleMute}
                  onLike={() => handleLike(item.moment.id)}
                  onLikesClick={() => handleLikesOpen(item.moment.id)}
                  onComment={() => handleComment(item.moment)}
                  onShare={() => handleShare(item.moment)}
                  onSave={() => handleSave(item.moment.id)}
                  onOptions={() => handleOptions(item.moment)}
                  preloadHint={preloadHint}
                />
              </div>
            </React.Fragment>
          );
          })}

          {loadingMore && (
            <div className="snap-start flex items-center justify-center bg-black" style={viewportHeightStyle}>
              <span className="loader" style={{ width: 24, height: 24, borderTopColor: "white" }} />
            </div>
          )}
        </div>
      </div>

      {/* Comment Modal */}
      {commentModal && (
        <Suspense fallback={null}>
          <CommentsModal
            open={!!commentModal}
            onClose={() => setCommentModal(null)}
            postId={commentModal.postId}
            commentCount={commentModal.count}
            postSlug={commentModal.slug}
          />
        </Suspense>
      )}

      {/* Share Modal */}
      {shareModal && (
        <Suspense fallback={null}>
          <ShareModal
            open={!!shareModal}
            onClose={() => setShareModal(null)}
            url={shareModal.url}
            title={shareModal.title}
            postId={shareModal.postId}
            isVideo
            postSlug={shareModal.slug}
          />
        </Suspense>
      )}

      {/* Options Modal — always rendered, open controlled via prop */}
      <Suspense fallback={null}>
        <PostMoreModal
          open={!!optionsModal}
          onClose={() => setOptionsModal(null)}
          postId={optionsModal?.postId ?? 0}
          postUrl={optionsModal ? `/moments?s=${optionsModal.slug}` : ''}
          authorUsername={optionsModal?.authorUsername}
          authorUserId={optionsModal?.authorUserId}
          authorName={optionsModal?.authorName}
          authorRole={optionsModal?.authorRole}
          postSlug={optionsModal?.slug}
          contentType="moment"
          visibility={optionsModal?.visibility || "public"}
          onDeleteSuccess={() => {
            setMoments(prev => prev.filter(m => m.id !== optionsModal?.postId));
          }}
        />
      </Suspense>

      {/* Likes Modal */}
      {likesModalPostId !== null && (
        <Suspense fallback={null}>
          <LikesModal
            open={likesModalPostId !== null}
            onClose={() => setLikesModalPostId(null)}
            postId={likesModalPostId}
          />
        </Suspense>
      )}

      {/* Idle pause overlay — "Are you still watching?" */}
      {idlePaused && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-bg-primary rounded-2xl p-6 mx-4 max-w-[320px] w-full text-center shadow-xl">
            <p className="text-lg font-bold text-text-primary mb-1">{t("stillWatching")}</p>
            <p className="text-sm text-text-muted mb-5">{t("stillWatchingDesc")}</p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleContinueWatching}
                className="w-full h-11 rounded-xl bg-accent-main text-white font-semibold text-sm hover:opacity-90 transition"
              >
                {t("continueWatching")}
              </button>
              <button
                onClick={handleStopWatching}
                className="w-full h-11 rounded-xl bg-bg-secondary text-text-primary font-medium text-sm hover:bg-bg-tertiary transition"
              >
                {t("stopWatching")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

