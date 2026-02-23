"use client";

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Heart, MessageCircle, Bookmark, Gift } from "lucide-react";
import ShareIcon from "@/components/ShareIcon";
import { decodeId } from "@/lib/hashId";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { cn, formatCount } from "@/lib/utils";
import PostStats from "@/components/PostStats";
import { feedimAlert } from "@/components/FeedimAlert";

const CommentsModal = lazy(() => import("@/components/modals/CommentsModal"));
const LikesModal = lazy(() => import("@/components/modals/LikesModal"));
const ShareModal = lazy(() => import("@/components/modals/ShareModal"));
const GiftModal = lazy(() => import("@/components/modals/GiftModal"));
const PostStatsModal = lazy(() => import("@/components/modals/PostStatsModal"));

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
}

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
}: PostInteractionBarProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftMounted, setGiftMounted] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [avgDuration, setAvgDuration] = useState<number | null>(null);
  const [engagementRate, setEngagementRate] = useState<number | null>(null);
  const [likedByUsers, setLikedByUsers] = useState<{ username: string; full_name?: string; avatar_url?: string }[]>([]);
  const [targetCommentId, setTargetCommentId] = useState<number | null>(null);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const searchParams = useSearchParams();

  // Auto-open comments modal from ?comment= URL param (obfuscated ID)
  useEffect(() => {
    const commentParam = searchParams.get("comment");
    if (commentParam) {
      const commentId = decodeId(commentParam);
      if (commentId !== null && commentId > 0) {
        setTargetCommentId(commentId);
        setCommentsOpen(true);
      }
    }
  }, [searchParams]);

  // Fetch stats for own post (avg reading time + engagement)
  useEffect(() => {
    if (!isOwnPost) return;
    fetch(`/api/posts/${postId}/stats`)
      .then(r => r.json())
      .then(data => {
        if (data.readStats) setAvgDuration(data.readStats.avgReadDuration || 0);
        if (data.engagementRate !== undefined) setEngagementRate(data.engagementRate || 0);
      })
      .catch(() => {});
  }, [postId, isOwnPost]);

  useEffect(() => {
    if (initialLikeCount > 0) {
      fetch(`/api/posts/${postId}/likes?page=1`)
        .then(r => r.json())
        .then(data => setLikedByUsers((data.users || []).slice(0, 3)))
        .catch(() => {});
    }
  }, [postId, initialLikeCount]);

  // Refs to track latest state for rapid clicks
  const likedRef = useRef(initialLiked);
  const savedRef = useRef(initialSaved);

  const handleLike = async () => {
    if (!currentUser) { const user = await requireAuth(); if (!user) return; }

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
        if (res.status === 429) {
          res.json().then(data => feedimAlert("error", data.error || "Günlük beğeni limitine ulaştın")).catch(() => {});
        }
      }
    }).catch(() => {});
  };

  const handleSave = async () => {
    if (!currentUser) { const user = await requireAuth(); if (!user) return; }

    const newSaved = !savedRef.current;
    savedRef.current = newSaved;
    setSaved(newSaved);
    setSaveCount(c => Math.max(0, c + (newSaved ? 1 : -1)));

    fetch(`/api/posts/${postId}/save`, { method: "POST", keepalive: true }).then(res => {
      if (!res.ok) {
        savedRef.current = !newSaved;
        setSaved(!newSaved);
        setSaveCount(c => Math.max(0, c + (newSaved ? -1 : 1)));
        if (res.status === 429) {
          res.json().then(data => feedimAlert("error", data.error || "Günlük kaydetme limitine ulaştın")).catch(() => {});
        }
      }
    }).catch(() => {});
  };

  const openComments = () => {
    setCommentsOpen(true);
  };

  return (
    <>
      {/* Stats row — views + likes */}
      {!hideStats && <PostStats viewCount={viewCount} likeCount={likeCount} />}

      {/* Liked by — top position (default for regular posts) */}
      {!likedByBottom && likeCount > 0 && likedByUsers.length > 0 && (
        <button
          onClick={() => setLikesOpen(true)}
          className="flex items-center gap-1.5 py-2 text-[0.9rem] text-text-muted transition w-full text-left hover:underline"
          aria-label="Beğenen kişileri gör"
        >
          <div className="flex -space-x-2 shrink-0">
            {likedByUsers.map((u) => (
              u.avatar_url ? (
                <img key={u.username} src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border-2 border-bg-primary" />
              ) : (
                <img key={u.username} className="default-avatar-auto h-7 w-7 rounded-full object-cover border-2 border-bg-primary" alt="" />
              )
            ))}
          </div>
          <span>
            {likeCount === 1
              ? <><strong className="font-semibold text-text-primary">@{likedByUsers[0]?.username}</strong> beğendi</>
              : likeCount === 2 && likedByUsers.length >= 2
                ? <><strong className="font-semibold text-text-primary">@{likedByUsers[0]?.username}</strong> ve <strong className="font-semibold text-text-primary">@{likedByUsers[1]?.username}</strong> beğendi</>
                : <><strong className="font-semibold text-text-primary">@{likedByUsers[0]?.username}</strong> ve <strong className="font-semibold text-text-primary">{formatCount(likeCount - 1)} kişi</strong> beğendi</>
            }
          </span>
        </button>
      )}

      {/* Slot — for regular posts: between liked-by and bar */}
      {!likedByBottom && children}

      {/* Gift or Stats — full width above interaction bar */}
      {isOwnPost ? (
        <button
          onClick={() => setStatsOpen(true)}
          className="flex flex-col w-full mt-4 py-3 px-4 rounded-[15px] bg-bg-secondary hover:opacity-90 transition text-left"
        >
          <span className="text-[0.88rem] font-bold">İstatistikler</span>
          <span className="flex items-center gap-1 text-[0.72rem] text-text-muted mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary"><path d="M21 21H6.2C5.08 21 4.52 21 4.09 20.782C3.72 20.59 3.41 20.284 3.22 19.908C3 19.48 3 18.92 3 17.8V3" /><path d="M7 15l4-6 4 4 6-8" /></svg>
            {avgDuration !== null
              ? `Ort. Süre ${avgDuration > 60 ? `${Math.round(avgDuration / 60)}dk` : `${avgDuration}sn`}`
              : "Ort. Süre —"
            }
            {engagementRate !== null ? ` %${Math.min(engagementRate, 99)} etkileşim` : ""}
            {` ${formatCount(commentCount)} yorum`}
          </span>
        </button>
      ) : (
        <button
          onClick={() => { setGiftOpen(true); setGiftMounted(true); }}
          className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl text-[0.84rem] font-semibold bg-bg-secondary text-text-primary hover:bg-bg-tertiary transition"
        >
          <Gift className="h-[18px] w-[18px]" />
          <span>Hediye Gonder</span>
        </button>
      )}

      {/* Interaction bar — sticky on mobile */}
      <div className={`sticky bottom-0 z-40 bg-bg-primary sticky-ambient ${likedByBottom ? "mt-2" : "mt-2 mb-4"}`}>
        <div className="flex items-center gap-2 py-3 px-2 md:px-0">
        {/* Like */}
        <button
          onClick={handleLike}
          data-hotkey="like"
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold transition",
            liked ? "bg-error/10 text-error" : "bg-bg-secondary text-text-primary hover:text-error"
          )}
        >
          <Heart className={cn("h-[18px] w-[18px] transition-transform", liked && "fill-current", likeAnimating && "scale-125")} />
          <span>{formatCount(likeCount)}</span>
        </button>

        {/* Comments */}
        <button
          onClick={openComments}
          data-hotkey="comments"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold bg-bg-secondary text-text-primary hover:text-accent-main transition"
        >
          <MessageCircle className="h-[18px] w-[18px]" />
          <span>{formatCount(commentCount)}</span>
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          data-hotkey="save"
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold transition",
            saved ? "bg-accent-main/10 text-accent-main" : "bg-bg-secondary text-text-primary hover:text-accent-main"
          )}
        >
          <Bookmark className={cn("h-[18px] w-[18px]", saved && "fill-current")} />
          <span>{formatCount(saveCount)}</span>
        </button>

        {/* Share */}
        <button
          onClick={() => setShareOpen(true)}
          data-hotkey="share"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[0.82rem] font-semibold bg-bg-secondary text-text-primary hover:text-accent-main transition"
        >
          <ShareIcon className="h-[18px] w-[18px]" />
          <span>{formatCount(shareCount)}</span>
        </button>
        </div>
      </div>

      {/* Slot — for video posts: between bar and liked-by */}
      {likedByBottom && children}

      {/* Liked by — bottom position (for video pages) */}
      {likedByBottom && likeCount > 0 && likedByUsers.length > 0 && (
        <button
          onClick={() => setLikesOpen(true)}
          className="flex items-center gap-2.5 py-2 text-[0.9rem] text-text-muted transition w-full text-left hover:underline"
          aria-label="Beğenen kişileri gör"
        >
          <div className="flex -space-x-2 shrink-0">
            {likedByUsers.map((u) => (
              u.avatar_url ? (
                <img key={u.username} src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover border-2 border-bg-primary" />
              ) : (
                <img key={u.username} className="default-avatar-auto h-7 w-7 rounded-full object-cover border-2 border-bg-primary" alt="" />
              )
            ))}
          </div>
          <span>
            {likeCount === 1
              ? <><strong className="font-semibold text-text-primary">@{likedByUsers[0]?.username}</strong> beğendi</>
              : likeCount === 2 && likedByUsers.length >= 2
                ? <><strong className="font-semibold text-text-primary">@{likedByUsers[0]?.username}</strong> ve <strong className="font-semibold text-text-primary">@{likedByUsers[1]?.username}</strong> beğendi</>
                : <><strong className="font-semibold text-text-primary">@{likedByUsers[0]?.username}</strong> ve <strong className="font-semibold text-text-primary">{formatCount(likeCount - 1)} kişi</strong> beğendi</>
            }
          </span>
        </button>
      )}

      {commentsOpen && (
        <Suspense fallback={null}>
          <CommentsModal
            open={commentsOpen}
            onClose={() => { setCommentsOpen(false); setTargetCommentId(null); }}
            postId={postId}
            commentCount={commentCount}
            postSlug={postSlug}
            targetCommentId={targetCommentId}
          />
        </Suspense>
      )}

      {likesOpen && (
        <Suspense fallback={null}>
          <LikesModal
            open={likesOpen}
            onClose={() => setLikesOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}

      {shareOpen && (
        <Suspense fallback={null}>
          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            url={postUrl}
            title={postTitle}
            postId={postId}
            isVideo={isVideo}
            postSlug={postSlug}
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

      {isOwnPost && statsOpen && (
        <Suspense fallback={null}>
          <PostStatsModal
            open={statsOpen}
            onClose={() => setStatsOpen(false)}
            postId={postId}
          />
        </Suspense>
      )}
    </>
  );
}
