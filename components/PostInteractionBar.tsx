"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Gift, BookOpen, Rocket, Clock, Pause } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import ShareIcon from "@/components/ShareIcon";
import { decodeId } from "@/lib/hashId";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { cn, formatCount } from "@/lib/utils";
import PostStats from "@/components/PostStats";
import LazyAvatar from "@/components/LazyAvatar";
import { feedimAlert } from "@/components/FeedimAlert";
import { fetchWithCache, withCacheScope, invalidateCache } from "@/lib/fetchWithCache";
import { FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";
import { onMutation } from "@/lib/mutationEvents";

const CommentsModal = lazy(() => import("@/components/modals/CommentsModal"));
const LikesModal = lazy(() => import("@/components/modals/LikesModal"));
const ShareModal = lazy(() => import("@/components/modals/ShareModal"));
const GiftModal = lazy(() => import("@/components/modals/GiftModal"));
const PostStatsModal = lazy(() => import("@/components/modals/PostStatsModal"));
const BoostModal = lazy(() => import("@/components/modals/BoostModal"));
const BoostDetailsModal = lazy(() => import("@/components/modals/BoostDetailsModal"));

let commonInteractionModalsPreloaded = false;
let ownerInteractionModalsPreloaded = false;

function preloadCommonInteractionModals() {
  if (commonInteractionModalsPreloaded) return;
  commonInteractionModalsPreloaded = true;
  void import("@/components/modals/CommentsModal");
  void import("@/components/modals/LikesModal");
  void import("@/components/modals/ShareModal");
  void import("@/components/modals/GiftModal");
}

function preloadOwnerInteractionModals() {
  if (ownerInteractionModalsPreloaded) return;
  ownerInteractionModalsPreloaded = true;
  void import("@/components/modals/PostStatsModal");
  void import("@/components/modals/BoostModal");
  void import("@/components/modals/BoostDetailsModal");
}

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface LikedByUser {
  username: string;
  full_name?: string;
  avatar_url?: string;
  is_following?: boolean;
  is_own?: boolean;
}

interface PostInteractionBarProps {
  postId: number;
  initialLiked: boolean;
  initialSaved: boolean;
  likeCount: number;
  commentCount?: number;
  saveCount: number;
  shareCount?: number;
  viewCount?: number;
  postUrl: string;
  postTitle: string;
  postSlug?: string;
  authorUsername?: string;
  hideStats?: boolean;
  isOwnPost?: boolean;
  children?: React.ReactNode;
  likedByBottom?: boolean;
  isVideo?: boolean;
  contentType?: string;
  isBoosted?: boolean;
  boostStats?: { impressions: number; clicks: number; boost_code: string } | null;
  boostStatus?: string | null;
  visibility?: string;
  isModeration?: boolean;
  allowComments?: boolean;
  /** Feed/card mode — "full" = 4 buttons (like,comment,save,share), "no-like" = 3 buttons (comment,save,share) + "Oku" link */
  compact?: "full" | "no-like" | boolean;
}

const normalizeCount = (value: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
};

export default function PostInteractionBar({
  postId,
  initialLiked,
  initialSaved,
  likeCount: initialLikeCount,
  commentCount = 0,
  saveCount: initialSaveCount,
  shareCount: initialShareCount = 0,
  viewCount = 0,
  postUrl,
  postTitle,
  postSlug,
  authorUsername,
  hideStats,
  isOwnPost,
  children,
  likedByBottom,
  isVideo,
  contentType,
  isBoosted,
  boostStats,
  boostStatus,
  visibility,
  isModeration,
  allowComments = true,
  compact,
}: PostInteractionBarProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(() => Math.max(normalizeCount(initialLikeCount), initialLiked ? 1 : 0));
  const [saveCount, setSaveCount] = useState(() => Math.max(normalizeCount(initialSaveCount), initialSaved ? 1 : 0));
  const [shareCount, setShareCount] = useState(() => normalizeCount(initialShareCount));
  const [liveCommentCount, setLiveCommentCount] = useState(() => normalizeCount(commentCount));
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsMounted, setCommentsMounted] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [likesMounted, setLikesMounted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMounted, setShareMounted] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftMounted, setGiftMounted] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsMounted, setStatsMounted] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [boostMounted, setBoostMounted] = useState(false);
  const [boostDetailsOpen, setBoostDetailsOpen] = useState(false);
  const [boostDetailsMounted, setBoostDetailsMounted] = useState(false);
  const [avgDuration, setAvgDuration] = useState<number | null>(null);
  const [engagementRate, setEngagementRate] = useState<number | null>(null);
  const [likedByUsers, setLikedByUsers] = useState<LikedByUser[]>([]);
  const [targetCommentId, setTargetCommentId] = useState<number | null>(null);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const locale = useLocale();
  const displayLikeCount = liked ? Math.max(likeCount, 1) : likeCount;
  const displaySaveCount = saved ? Math.max(saveCount, 1) : saveCount;

  // Listen for comment mutations to sync count in real-time
  useEffect(() => {
    return onMutation((detail) => {
      if (detail.postId === postId && (detail.type === "comment-added" || detail.type === "comment-deleted")) {
        setLiveCommentCount(c => Math.max(0, c + (detail.delta || 0)));
      }
    });
  }, [postId]);

  // Preload most common modals after idle — eliminates first-open delay
  useEffect(() => {
    const preload = () => {
      preloadCommonInteractionModals();
      if (isOwnPost) preloadOwnerInteractionModals();
    };
    const idleWindow = window as IdleCallbackWindow;
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => preload(), { timeout: 500 });
      return () => idleWindow.cancelIdleCallback?.(id);
    } else {
      const id = setTimeout(preload, 300);
      return () => clearTimeout(id);
    }
  }, [isOwnPost]);

  // Auto-open comments modal from ?comment= URL param (obfuscated ID)
  useEffect(() => {
    if (compact) return;
    const commentParam = searchParams.get("comment");
    if (commentParam) {
      const commentId = decodeId(commentParam);
      if (commentId !== null && commentId > 0) {
        setCommentsMounted(true);
        setTargetCommentId(commentId);
        setCommentsOpen(true);
      }
    }
  }, [searchParams, compact]);

  // Fetch stats for own post (avg reading time + engagement)
  useEffect(() => {
    if (compact || !isOwnPost) return;
    fetchWithCache(`/api/posts/${postId}/stats`, { ttlSeconds: FRESHNESS_WINDOWS.postStats })
      .then((data) => data as {
        post?: { content_type?: string };
        videoStats?: { avgWatchDuration?: number };
        readStats?: { avgReadDuration?: number };
        engagementRate?: number;
      })
      .then(data => {
        const isVid = data.post?.content_type === "video" || data.post?.content_type === "moment";
        if (isVid && data.videoStats) {
          setAvgDuration(data.videoStats.avgWatchDuration || 0);
        } else if (data.readStats) {
          setAvgDuration(data.readStats.avgReadDuration || 0);
        }
        if (data.engagementRate !== undefined) setEngagementRate(data.engagementRate || 0);
      })
      .catch(() => {});
  }, [postId, isOwnPost, compact]);

  const isNote = contentType === "note";
  useEffect(() => {
    if (compact || initialLikeCount <= 0) return;
    fetchWithCache(
      withCacheScope(`/api/posts/${postId}/likes?page=1`, currentUser?.id ? `viewer:${currentUser.id}` : "guest"),
      { ttlSeconds: 30 }
    )
      .then((data) => data as {
        users?: LikedByUser[];
      })
      .then(data => {
        const all = data.users || [];
        const filtered = all.filter((u) => !u.is_own);
        filtered.sort((a, b) => (b.is_following ? 1 : 0) - (a.is_following ? 1 : 0));
        setLikedByUsers(filtered.slice(0, 3));
      })
      .catch(() => {});
  }, [postId, initialLikeCount, currentUser?.id, compact]);

  // Refs to track latest state for rapid clicks
  const likedRef = useRef(initialLiked);
  const savedRef = useRef(initialSaved);
  const likePending = useRef(false);
  const savePending = useRef(false);

  // Sync when batch interaction data arrives (compact/feed mode)
  const likedInteractionHydrated = useRef(initialLiked);
  const savedInteractionHydrated = useRef(initialSaved);
  useEffect(() => {
    if (!compact) return;
    if (initialLiked && !likedInteractionHydrated.current) {
      setLiked(true);
      likedRef.current = true;
      setLikeCount((prev) => Math.max(prev, normalizeCount(initialLikeCount), 1));
      likedInteractionHydrated.current = true;
    }
    if (initialSaved && !savedInteractionHydrated.current) {
      setSaved(true);
      savedRef.current = true;
      setSaveCount((prev) => Math.max(prev, normalizeCount(initialSaveCount), 1));
      savedInteractionHydrated.current = true;
    }
  }, [initialLiked, initialSaved, initialLikeCount, initialSaveCount, compact]);

  const handleLike = async () => {
    if (likePending.current) return;
    if (!currentUser) { const user = await requireAuth(); if (!user) return; }

    likePending.current = true;
    const newLiked = !likedRef.current;
    likedRef.current = newLiked;
    setLiked(newLiked);
    setLikeCount(c => Math.max(0, c + (newLiked ? 1 : -1)));
    if (newLiked) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 400);
    }

    fetch(`/api/posts/${postId}/like`, { method: "POST", keepalive: true }).then(res => {
      if (!res.ok) {
        likedRef.current = !newLiked;
        setLiked(!newLiked);
        setLikeCount(c => Math.max(0, c + (newLiked ? -1 : 1)));
        if (res.status === 429 || res.status === 403) {
          res.json().then(data => feedimAlert("error", data.error || t('errors.likeLimitReached'))).catch(() => {});
        }
      } else {
        invalidateCache(`/api/posts/${postId}/stats`);
      }
    }).catch(() => {
      likedRef.current = !newLiked;
      setLiked(!newLiked);
      setLikeCount(c => Math.max(0, c + (newLiked ? -1 : 1)));
    }).finally(() => { likePending.current = false; });
  };

  const handleSave = async () => {
    if (savePending.current) return;
    if (!currentUser) { const user = await requireAuth(); if (!user) return; }

    savePending.current = true;
    const newSaved = !savedRef.current;
    savedRef.current = newSaved;
    setSaved(newSaved);
    setSaveCount(c => Math.max(0, c + (newSaved ? 1 : -1)));

    fetch(`/api/posts/${postId}/save`, { method: "POST", keepalive: true }).then(res => {
      if (!res.ok) {
        savedRef.current = !newSaved;
        setSaved(!newSaved);
        setSaveCount(c => Math.max(0, c + (newSaved ? -1 : 1)));
        if (res.status === 429 || res.status === 403) {
          res.json().then(data => feedimAlert("error", data.error || t('errors.saveLimitReached'))).catch(() => {});
        }
      } else {
        invalidateCache("/internal/bookmarks");
        invalidateCache(`/api/posts/${postId}/stats`);
      }
    }).catch(() => {
      savedRef.current = !newSaved;
      setSaved(!newSaved);
      setSaveCount(c => Math.max(0, c + (newSaved ? -1 : 1)));
    }).finally(() => { savePending.current = false; });
  };

  const openComments = () => {
    preloadCommonInteractionModals();
    setCommentsMounted(true);
    setCommentsOpen(true);
  };

  const openShare = () => {
    preloadCommonInteractionModals();
    setShareMounted(true);
    setShareOpen(true);
  };

  const openGift = () => {
    preloadCommonInteractionModals();
    setGiftOpen(true);
    setGiftMounted(true);
  };

  const openLikes = () => {
    preloadCommonInteractionModals();
    setLikesMounted(true);
    setLikesOpen(true);
  };

  const openStats = () => {
    preloadOwnerInteractionModals();
    setStatsMounted(true);
    setStatsOpen(true);
  };

  const openBoost = () => {
    preloadOwnerInteractionModals();
    setBoostMounted(true);
    setBoostOpen(true);
  };

  const openBoostDetails = () => {
    preloadOwnerInteractionModals();
    setBoostDetailsMounted(true);
    setBoostDetailsOpen(true);
  };

  // Compact: feed action buttons + modals
  if (compact) {
    const noLike = compact === "no-like";
    return (
      <>
        {/* Liked by */}
        {displayLikeCount > 0 && likedByUsers.length > 0 && (
          <button
            onClick={openLikes}
            onPointerDown={preloadCommonInteractionModals}
            onMouseEnter={preloadCommonInteractionModals}
            className="group flex items-center gap-1 pb-2 px-2 sm:px-0 text-[0.78rem] text-text-muted transition w-full text-left hover:underline"
          >
            <div className="flex -space-x-1.5 shrink-0">
              {likedByUsers.map((u) => (
                <LazyAvatar key={u.username} src={u.avatar_url} alt="" sizeClass="h-6 w-6" borderClass="border border-border-primary" />
              ))}
            </div>
            <span className="min-w-0 flex-1 truncate group-hover:underline">
              {displayLikeCount === 1
                ? <><strong className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.liked')}</>
                : displayLikeCount === 2 && likedByUsers.length >= 2
                  ? <><strong className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.and')} <strong className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{likedByUsers[1]?.username}</strong> {t('interaction.liked')}</>
                  : <><strong className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.and')} <strong className="font-semibold text-text-primary group-hover:underline">{formatCount(displayLikeCount - 1, locale)} {t('interaction.people')}</strong> {t('interaction.liked')}</>
              }
            </span>
          </button>
        )}
        <div className="flex items-center justify-between select-none">
          {noLike ? (
            <Link href={postUrl} className="flex items-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold text-text-muted hover:text-accent-main transition">
              <BookOpen className="h-5 w-5" />
              <span>{t('interaction.seeMore')}</span>
            </Link>
          ) : (
            <button onClick={handleLike} aria-label={t('tooltip.like')} className={cn("flex items-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold transition", liked ? "text-error" : "text-text-muted hover:text-error")}>
              <Heart className={cn("h-5 w-5 transition-transform", liked && "fill-current", likeAnimating && "scale-125")} />
              <span className="min-w-[1ch]">{formatCount(displayLikeCount, locale)}</span>
            </button>
          )}
          <button onClick={openComments} onPointerDown={preloadCommonInteractionModals} onMouseEnter={preloadCommonInteractionModals} aria-label={t('tooltip.comment')} className="flex items-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold text-text-muted hover:text-accent-main transition">
            <MessageCircle className="h-5 w-5" />
            <span className="min-w-[1ch]">{formatCount(liveCommentCount, locale)}</span>
          </button>
          <button onClick={openShare} onPointerDown={preloadCommonInteractionModals} onMouseEnter={preloadCommonInteractionModals} aria-label={t('tooltip.share')} className="flex items-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold text-text-muted hover:text-accent-main transition">
            <ShareIcon className="h-5 w-5" />
            <span className="min-w-[1ch]">{formatCount(shareCount, locale)}</span>
          </button>
          <button onClick={handleSave} aria-label={t('tooltip.save')} className={cn("flex items-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold transition", saved ? "text-accent-main" : "text-text-muted hover:text-accent-main")}>
            <Bookmark className={cn("h-5 w-5", saved && "fill-current")} />
            <span className="min-w-[1ch]">{formatCount(displaySaveCount, locale)}</span>
          </button>
        </div>
        {commentsMounted && (
          <Suspense fallback={null}>
            <CommentsModal open={commentsOpen} onClose={() => setCommentsOpen(false)} postId={postId} commentCount={liveCommentCount} postSlug={postSlug} allowComments={allowComments} />
          </Suspense>
        )}
        {shareMounted && (
          <Suspense fallback={null}>
            <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} url={postUrl} title={postTitle} postId={postId} isVideo={isVideo} postSlug={postSlug} contentType={contentType} onShareSuccess={() => setShareCount(c => c + 1)} />
          </Suspense>
        )}
        {likesMounted && (
          <Suspense fallback={null}>
            <LikesModal open={likesOpen} onClose={() => setLikesOpen(false)} postId={postId} />
          </Suspense>
        )}
      </>
    );
  }

  return (
    <>
      {/* Stats row — views + likes */}
      {!hideStats && <PostStats viewCount={viewCount} likeCount={displayLikeCount} />}

      {/* Liked by — top position (default for regular posts) */}
      {!likedByBottom && displayLikeCount > 0 && likedByUsers.length > 0 && (
        <button
          onClick={openLikes}
          onPointerDown={preloadCommonInteractionModals}
          onMouseEnter={preloadCommonInteractionModals}
          className="group flex items-center gap-1 py-2 px-2 sm:px-0 text-[0.86rem] text-text-muted transition w-full text-left hover:underline"
          aria-label={t('interaction.seeLikers')}
        >
          <div className="flex -space-x-1.5 shrink-0">
            {likedByUsers.map((u) => (
              <LazyAvatar key={u.username} src={u.avatar_url} alt="" sizeClass="h-6 w-6" borderClass="border border-border-primary" />
            ))}
          </div>
          <span className="min-w-0 flex-1 truncate group-hover:underline">
            {displayLikeCount === 1
              ? <><strong className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.liked')}</>
              : displayLikeCount === 2 && likedByUsers.length >= 2
                ? <><strong className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.and')} <strong className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{likedByUsers[1]?.username}</strong> {t('interaction.liked')}</>
                : <><strong className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.and')} <strong className="font-semibold text-text-primary group-hover:underline">{formatCount(displayLikeCount - 1, locale)} {t('interaction.people')}</strong> {t('interaction.liked')}</>
            }
          </span>
        </button>
      )}

      {/* Slot — for regular posts: between liked-by and bar */}
      {!likedByBottom && children}

      {/* Gift or Stats — full width above interaction bar */}
      {isOwnPost ? (
        <>
        <button
          onClick={openStats}
          onPointerDown={preloadOwnerInteractionModals}
          onMouseEnter={preloadOwnerInteractionModals}
          className="flex flex-col w-full mt-4 py-3 px-4 rounded-[11px] bg-bg-secondary hover:opacity-90 transition text-left"
        >
          <span className="text-[0.88rem] font-bold">{t('interaction.stats')}</span>
          <span className="flex items-center gap-1 text-[0.72rem] text-text-muted mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary"><path d="M21 21H6.2C5.08 21 4.52 21 4.09 20.782C3.72 20.59 3.41 20.284 3.22 19.908C3 19.48 3 18.92 3 17.8V3" /><path d="M7 15l4-6 4 4 6-8" /></svg>
            {avgDuration !== null
              ? `${t('interaction.avgDuration')} ${avgDuration > 60 ? `${Math.round(avgDuration / 60)}${t('interaction.min')}` : `${avgDuration}${t('interaction.sec')}`}`
              : `${t('interaction.avgDuration')} —`
            }
            {` ${formatCount(liveCommentCount, locale)} ${t('interaction.comment')}`}
          </span>
        </button>
        {/* Boost section */}
        {isBoosted && boostStatus === 'active' ? (
          <button
            onClick={openBoostDetails}
            onPointerDown={preloadOwnerInteractionModals}
            onMouseEnter={preloadOwnerInteractionModals}
            className="flex flex-col w-full mt-2 py-3 px-4 rounded-[11px] bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/15 hover:bg-[var(--accent-color)]/8 transition text-left"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1.5">
                <Rocket className="h-4 w-4 text-[var(--accent-color)]" />
                <span className="text-[0.82rem] font-semibold text-[var(--accent-color)]">{t('boost.postBoosted')}</span>
              </div>
              <span className="text-[0.72rem] text-[var(--accent-color)]">{t('boost.boostDetails')} →</span>
            </div>
          </button>
        ) : isBoosted && boostStatus === 'pending_review' ? (
          <button
            onClick={openBoostDetails}
            onPointerDown={preloadOwnerInteractionModals}
            onMouseEnter={preloadOwnerInteractionModals}
            className="flex flex-col w-full mt-2 py-3 px-4 rounded-[11px] bg-[var(--accent-color)]/5 border border-[var(--accent-color)]/15 hover:bg-[var(--accent-color)]/8 transition text-left"
          >
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--accent-color)]" />
              <span className="text-[0.82rem] font-semibold text-[var(--accent-color)]">{t('boost.pendingReview')}</span>
            </div>
          </button>
        ) : isBoosted && boostStatus === 'paused' ? (
          <button
            onClick={openBoostDetails}
            onPointerDown={preloadOwnerInteractionModals}
            onMouseEnter={preloadOwnerInteractionModals}
            className="flex flex-col w-full mt-2 py-3 px-4 rounded-[11px] bg-bg-secondary border border-border-primary/30 hover:bg-bg-tertiary transition text-left"
          >
            <div className="flex items-center gap-1.5">
              <Pause className="h-4 w-4 text-text-muted" />
              <span className="text-[0.82rem] font-semibold text-text-muted">{t('boost.boostPaused')}</span>
            </div>
          </button>
        ) : !currentUser?.accountPrivate && visibility === "public" && !isModeration ? (
          <button
            onClick={() => {
              if (currentUser?.accountType === "creator" || currentUser?.accountType === "business") {
                openBoost();
              } else {
                feedimAlert("info", t('boost.requiresProfessional'));
              }
            }}
            onPointerDown={preloadOwnerInteractionModals}
            onMouseEnter={preloadOwnerInteractionModals}
            className="flex items-center justify-between w-full mt-2 py-3 px-4 rounded-[11px] bg-bg-secondary hover:bg-bg-tertiary transition text-left"
          >
            <span className="text-[0.82rem] font-medium text-text-muted">{t('boost.ctaQuestion')}</span>
            <span className="text-[0.82rem] font-semibold text-accent-main shrink-0 ml-3">
              {t('boost.ctaButton')}
            </span>
          </button>
        ) : null}
        </>
      ) : contentType !== "note" && contentType !== "moment" ? (
        <button
          onClick={openGift}
          onPointerDown={preloadCommonInteractionModals}
          onMouseEnter={preloadCommonInteractionModals}
          className="w-full flex items-center justify-center gap-2 py-3 mt-3 rounded-xl text-[0.84rem] font-semibold bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition"
        >
          <Gift className="h-4 w-4" />
          <span>{t('interaction.sendGift')}</span>
        </button>
      ) : null}

      {/* Interaction bar */}
      <div className={`bottom-0 ${likedByBottom ? "" : "mb-4"}`}>
        <div className="flex items-center gap-2 py-3 select-none">
        {/* Like */}
        <button
          onClick={handleLike}
          data-hotkey="like"
          data-tooltip={t('tooltip.like')}
          aria-label={t('tooltip.like')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold transition",
            liked ? "bg-error/10 text-error" : "bg-bg-secondary text-text-primary hover:text-error"
          )}
        >
          <Heart className={cn("h-[17px] w-[17px] transition-transform", liked && "fill-current", likeAnimating && "scale-125")} />
          <span>{formatCount(displayLikeCount, locale)}</span>
        </button>

        {/* Comments */}
        <button
          onClick={openComments}
          onPointerDown={preloadCommonInteractionModals}
          onMouseEnter={preloadCommonInteractionModals}
          data-hotkey="comments"
          data-tooltip={t('tooltip.comment')}
          aria-label={t('tooltip.comment')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold bg-bg-secondary text-text-primary hover:text-accent-main transition"
        >
          <MessageCircle className="h-[17px] w-[17px]" />
          <span>{formatCount(liveCommentCount, locale)}</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          data-hotkey="save"
          data-tooltip={t('tooltip.save')}
          aria-label={t('tooltip.save')}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold transition",
            saved ? "bg-accent-main/10 text-accent-main" : "bg-bg-secondary text-text-primary hover:text-accent-main"
          )}
        >
          <Bookmark className={cn("h-[17px] w-[17px]", saved && "fill-current")} />
          <span>{formatCount(displaySaveCount, locale)}</span>
        </button>

        {/* Share */}
        <button
          onClick={openShare}
          onPointerDown={preloadCommonInteractionModals}
          onMouseEnter={preloadCommonInteractionModals}
          data-hotkey="share"
          data-tooltip={t('tooltip.share')}
          aria-label={t('tooltip.share')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold bg-bg-secondary text-text-primary hover:text-accent-main transition"
        >
          <ShareIcon className="h-[17px] w-[17px]" />
          <span>{formatCount(shareCount, locale)}</span>
        </button>
        </div>
      </div>

      {/* Slot — for video posts: between bar and liked-by */}
      {likedByBottom && children}

      {/* Liked by — bottom position (for video pages) */}
      {likedByBottom && displayLikeCount > 0 && likedByUsers.length > 0 && (
        <button
          onClick={openLikes}
          onPointerDown={preloadCommonInteractionModals}
          onMouseEnter={preloadCommonInteractionModals}
          className="group flex items-center gap-1 py-2 px-2 sm:px-0 text-[0.8rem] text-text-muted transition w-full text-left hover:underline"
          aria-label={t('interaction.seeLikers')}
        >
          <div className="flex -space-x-1.5 shrink-0">
            {likedByUsers.map((u) => (
              <LazyAvatar key={u.username} src={u.avatar_url} alt="" sizeClass="h-6 w-6" borderClass="border border-border-primary" />
            ))}
          </div>
          <span className="min-w-0 flex-1 truncate group-hover:underline">
            {displayLikeCount === 1
              ? <><strong className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.liked')}</>
              : displayLikeCount === 2 && likedByUsers.length >= 2
                ? <><strong className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.and')} <strong className="font-semibold text-text-primary inline-block max-w-[12ch] truncate align-bottom group-hover:underline">@{likedByUsers[1]?.username}</strong> {t('interaction.liked')}</>
                : <><strong className="font-semibold text-text-primary inline-block max-w-[14ch] truncate align-bottom group-hover:underline">@{likedByUsers[0]?.username}</strong> {t('interaction.and')} <strong className="font-semibold text-text-primary group-hover:underline">{formatCount(displayLikeCount - 1, locale)} {t('interaction.people')}</strong> {t('interaction.liked')}</>
            }
          </span>
        </button>
      )}

      {commentsMounted && (
        <Suspense fallback={null}>
          <CommentsModal
            open={commentsOpen}
            onClose={() => { setCommentsOpen(false); setTargetCommentId(null); }}
            postId={postId}
            commentCount={liveCommentCount}
            postSlug={postSlug}
            targetCommentId={targetCommentId}
            allowComments={allowComments}
          />
        </Suspense>
      )}

      {likesMounted && (
        <Suspense fallback={null}>
          <LikesModal
            open={likesOpen}
            onClose={() => setLikesOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}

      {shareMounted && (
        <Suspense fallback={null}>
          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            url={postUrl}
            title={postTitle}
            postId={postId}
            isVideo={isVideo}
            postSlug={postSlug}
            contentType={contentType}
            onShareSuccess={() => setShareCount(c => c + 1)}
          />
        </Suspense>
      )}

      {!isOwnPost && giftMounted && (
        <Suspense fallback={null}>
          <GiftModal
            open={giftOpen}
            onClose={() => setGiftOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}

      {isOwnPost && statsMounted && (
        <Suspense fallback={null}>
          <PostStatsModal
            open={statsOpen}
            onClose={() => setStatsOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}

      {isOwnPost && boostMounted && (
        <Suspense fallback={null}>
          <BoostModal
            open={boostOpen}
            onClose={() => setBoostOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}

      {isOwnPost && boostDetailsMounted && (
        <Suspense fallback={null}>
          <BoostDetailsModal
            open={boostDetailsOpen}
            onClose={() => setBoostDetailsOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}
    </>
  );
}
