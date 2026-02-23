"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { ArrowLeft } from "lucide-react";
import MomentCard from "@/components/MomentCard";
import MomentAdCard from "@/components/MomentAdCard";
import { AD_MOMENTS_INTERVAL } from "@/lib/constants";
import { useDashboardShell } from "@/components/DashboardShell";
import LoadingShell from "@/components/LoadingShell";
import { useUser } from "@/components/UserContext";

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
  };
  post_tags?: { tags: { id: number; name: string; slug: string } }[];
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMobileNavVisible } = useDashboardShell();
  const { isLoggedIn } = useUser();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [globalMuted, setGlobalMuted] = useState(true);
  const [scrollLocked, setScrollLocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Modal states
  const [commentModal, setCommentModal] = useState<{ postId: number; count: number; slug: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ url: string; title: string; postId: number; slug: string } | null>(null);
  const [optionsModal, setOptionsModal] = useState<{ postId: number; slug: string; title: string; authorUsername?: string; authorUserId?: string } | null>(null);
  const [likesModalPostId, setLikesModalPostId] = useState<number | null>(null);

  // Capture initial slug only on mount — ignore subsequent URL changes
  const startSlug = useMemo(() => searchParams.get("s"), []);

  const requireAuth = useCallback(() => {
    if (isLoggedIn) return true;
    const next = `${window.location.pathname}${window.location.search}`;
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
    return false;
  }, [isLoggedIn]);

  // Hide mobile bottom nav
  useEffect(() => {
    setMobileNavVisible(false);
    return () => setMobileNavVisible(true);
  }, [setMobileNavVisible]);

  // Preload modals early to avoid first-open lag
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(preloadMomentsModals, { timeout: 1500 });
    } else {
      setTimeout(preloadMomentsModals, 800);
    }
  }, []);
  // Set ambient light attribute for video mode
  useEffect(() => {
    document.documentElement.setAttribute("data-moments-active", "1");
    return () => document.documentElement.removeAttribute("data-moments-active");
  }, []);

  const loadMoments = useCallback(async (cursor?: string) => {
    try {
      const url = `/api/posts/moments?limit=10${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      return { moments: data.moments || [], hasMore: data.hasMore || false };
    } catch {
      return { moments: [], hasMore: false };
    }
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
    })();
  }, []);

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
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = first.video_url;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => {
      if (preconnect) document.head.removeChild(preconnect);
      if (dnsPrefetch) document.head.removeChild(dnsPrefetch);
      document.head.removeChild(link);
    };
  }, [moments]);

  // IntersectionObserver
  useEffect(() => {
    if (moments.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Ad card detection
            if (entry.target.hasAttribute("data-ad-index")) {
              setScrollLocked(true);
              return;
            }
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(idx)) {
              setActiveIndex((prev) => (prev === idx ? prev : idx));
            }
          }
        });
      },
      { threshold: 0.8 }
    );

    const cards = containerRef.current?.querySelectorAll("[data-index], [data-ad-index]");
    cards?.forEach((card) => observerRef.current?.observe(card));

    return () => observerRef.current?.disconnect();
  }, [moments]);

  // Update browser URL as user scrolls through moments
  useEffect(() => {
    const current = moments[activeIndex];
    if (current) {
      window.history.replaceState(null, "", `/dashboard/moments?s=${current.slug}`);
    }
  }, [activeIndex, moments]);

  // Infinite loading — guests redirected to login on loadMore
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    if (activeIndex >= moments.length - 2) {
      if (!isLoggedIn) {
        window.location.href = `/login?next=${encodeURIComponent('/dashboard/moments')}`;
        return;
      }
      setLoadingMore(true);
      const lastMoment = moments[moments.length - 1];
      loadMoments(String(lastMoment.id)).then((data) => {
        setMoments(prev => [...prev, ...data.moments]);
        setHasMore(data.hasMore);
        setLoadingMore(false);
      });
    }
  }, [activeIndex, moments.length, hasMore, loadingMore, isLoggedIn]);

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
    fetch(`/api/posts/${momentId}/like`, { method: "POST", keepalive: true }).catch(() => {
      setLikedSet(prev => {
        const next = new Set(prev);
        if (wasLiked) next.add(momentId); else next.delete(momentId);
        return next;
      });
      setMoments(prev => prev.map(m =>
        m.id === momentId ? { ...m, like_count: (m.like_count || 0) + (wasLiked ? 1 : -1) } : m
      ));
    });
  }, [likedSet]);

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
    fetch(`/api/posts/${momentId}/save`, { method: "POST", keepalive: true }).catch(() => {
      setSavedSet(prev => {
        const next = new Set(prev);
        if (wasSaved) next.add(momentId); else next.delete(momentId);
        return next;
      });
      setMoments(prev => prev.map(m =>
        m.id === momentId ? { ...m, save_count: (m.save_count || 0) + (wasSaved ? 1 : -1) } : m
      ));
    });
  }, [savedSet]);

  const handleComment = useCallback((moment: Moment) => {
    if (!requireAuth()) return;
    setCommentModal({ postId: moment.id, count: moment.comment_count || 0, slug: moment.slug });
  }, [requireAuth]);

  const handleLikesOpen = useCallback((momentId: number) => {
    setLikesModalPostId(momentId);
  }, []);

  const handleShare = useCallback((moment: Moment) => {
    setShareModal({
      url: `/post/${moment.slug}`,
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
    });
  }, []);

  const handleAdSkip = useCallback(() => {
    setScrollLocked(false);
    // Scroll to the next card after the ad
    const container = containerRef.current;
    if (container) {
      const adCards = container.querySelectorAll("[data-ad-index]");
      adCards.forEach((ad) => {
        const next = ad.nextElementSibling;
        if (next) {
          next.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }
  }, []);

  if (loading) {
    return (
      <LoadingShell>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-3 sm:px-4 py-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[9/16] bg-bg-tertiary rounded-xl" />
          ))}
        </div>
      </LoadingShell>
    );
  }

  if (moments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-text-primary">
        <p className="text-lg font-semibold mb-2">Henüz moment yok</p>
        <p className="text-sm text-text-muted mb-6">İlk momenti sen oluştur!</p>
        <div className="flex flex-col items-center gap-3">
          <button onClick={() => { emitNavigationStart(); router.push("/dashboard/write/moment"); }} className="t-btn accept !h-10 !px-6 !text-sm">
            Moment Oluştur
          </button>
          <button onClick={() => router.back()} className="text-sm text-text-muted underline">Geri dön</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center h-[100svh] md:h-screen md:-mt-0 -mb-20 md:mb-0">
      {/* Centered Reels column */}
      <div
        className="relative w-full h-full"
        style={{ maxWidth: "min(62vh, 480px)" }}
      >
        {/* Top bar — back button + Moments title */}
        <div className="absolute top-0 left-0 right-0 z-[60] flex items-center px-4 pt-4 pb-2 pointer-events-none">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1
            className="flex-1 text-center text-white text-[1.1rem] font-bold pr-10"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7), 0 0 20px rgba(0,0,0,0.3)" }}
          >
            Moments
          </h1>
        </div>

        {/* Scroll container */}
        <div
          ref={containerRef}
          className={`h-full snap-y snap-mandatory scrollbar-hide overscroll-contain ${scrollLocked ? "overflow-hidden touch-action-none" : "overflow-y-auto touch-pan-y"}`}
          style={{ backgroundColor: "#000" }}
        >
      {moments.map((moment, index) => (
        <React.Fragment key={moment.id}>
          <div data-index={index}>
                <MomentCard
                  moment={moment}
                  isActive={index === activeIndex}
                  loadVideo={Math.abs(index - activeIndex) <= 1}
                  liked={likedSet.has(moment.id)}
                  saved={savedSet.has(moment.id)}
                  muted={globalMuted}
                  onToggleMute={handleToggleMute}
                  onLike={() => handleLike(moment.id)}
                  onLikesClick={() => handleLikesOpen(moment.id)}
                  onComment={() => handleComment(moment)}
                  onShare={() => handleShare(moment)}
                  onSave={() => handleSave(moment.id)}
                  onOptions={() => handleOptions(moment)}
                />
              </div>
              {(index + 1) % AD_MOMENTS_INTERVAL === 0 && (
                <div data-ad-index={index}>
                  <MomentAdCard
                    isActive={scrollLocked}
                    onSkip={handleAdSkip}
                  />
                </div>
              )}
            </React.Fragment>
          ))}

          {loadingMore && (
            <div className="h-20 flex items-center justify-center">
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

      {/* Options Modal */}
      {optionsModal && (
        <Suspense fallback={null}>
          <PostMoreModal
            open={!!optionsModal}
            onClose={() => setOptionsModal(null)}
            postId={optionsModal.postId}
            postUrl={`/post/${optionsModal.slug}`}
            authorUsername={optionsModal.authorUsername}
            authorUserId={optionsModal.authorUserId}
            postSlug={optionsModal.slug}
            contentType="moment"
          />
        </Suspense>
      )}

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
    </div>
  );
}
