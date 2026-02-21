"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, Play, Pause, MoreHorizontal } from "lucide-react";
import { formatCount } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import ShareIcon from "@/components/ShareIcon";

interface MomentCardProps {
  moment: {
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
  };
  isActive?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onOptions?: () => void;
  liked?: boolean;
  saved?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
}

export default memo(function MomentCard({ moment, isActive = false, onLike, onComment, onShare, onSave, onOptions, liked = false, saved = false, muted = true, onToggleMute }: MomentCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const playIconTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const author = moment.profiles;
  const tags = (moment.post_tags || []).map(pt => pt.tags).filter(Boolean);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  // Check if title is clamped or has tags (show "devamını oku" for both)
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight || tags.length > 0);
  }, [moment.title, tags.length]);

  // Sync muted prop to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = muted;
  }, [muted]);

  // Auto play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      video.muted = muted;
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setExpanded(false);
    }
  }, [isActive, muted]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }

    clearTimeout(playIconTimer.current);
    setShowPlayIcon(true);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 800);
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMute?.();
  }, [onToggleMute]);

  return (
    <div className="relative h-[100dvh] w-full bg-black snap-start snap-always">
      {/* Full-screen video */}
      <div className="absolute inset-0" onClick={togglePlayPause}>
        <video
          ref={videoRef}
          src={moment.video_url}
          poster={moment.video_thumbnail || moment.featured_image}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          preload={isActive ? "auto" : "metadata"}
        />

        {/* Play/Pause indicator */}
        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-20 h-20 rounded-full bg-black/30 flex items-center justify-center">
              {paused ? <Play className="h-10 w-10 text-white ml-1" /> : <Pause className="h-10 w-10 text-white" />}
            </div>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Mute button — top right */}
      <button
        onClick={toggleMute}
        className="absolute top-3 right-3 z-30 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
      >
        {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
      </button>

      {/* Right side action buttons — TikTok/Reels style */}
      <div className="absolute right-3 bottom-4 z-20 flex flex-col items-center gap-5 touch-manipulation">
        {/* Like */}
        <button onClick={(e) => { e.stopPropagation(); onLike?.(); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Heart className={`h-6 w-6 transition-transform ${liked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
          </div>
          <span className="text-white text-[0.7rem] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.like_count || 0)}
          </span>
        </button>

        {/* Comment */}
        <button onClick={(e) => { e.stopPropagation(); onComment?.(); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[0.7rem] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.comment_count || 0)}
          </span>
        </button>

        {/* Save */}
        <button onClick={(e) => { e.stopPropagation(); onSave?.(); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Bookmark className={`h-6 w-6 transition-transform ${saved ? "fill-white text-white scale-110" : "text-white"}`} />
          </div>
          <span className="text-white text-[0.7rem] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.save_count || 0)}
          </span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); onShare?.(); }} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <ShareIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-white text-[0.7rem] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.share_count || 0)}
          </span>
        </button>

        {/* Options */}
        <button onClick={(e) => { e.stopPropagation(); onOptions?.(); }} className="flex flex-col items-center active:scale-90 transition-transform">
          <div className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <MoreHorizontal className="h-6 w-6 text-white" />
          </div>
        </button>
      </div>

      {/* Bottom — author info + title + tags */}
      <div className="absolute bottom-4 left-4 right-[72px] z-20">
        <div className="flex items-center gap-2 mb-2.5">
          <Link href={`/u/${author?.username}`} className="flex items-center gap-2 min-w-0">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="rounded-full object-cover border-2 border-white/30" style={{ width: 37, height: 37 }} loading="lazy" />
            ) : (
              <img className="default-avatar-auto rounded-full object-cover border-2 border-white/30" style={{ width: 37, height: 37 }} alt="" loading="lazy" />
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white font-bold truncate" style={{ fontSize: "0.84rem", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                @{author?.username}
              </span>
              {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} />}
            </div>
          </Link>
          <Link
            href={`/u/${author?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-white text-[0.7rem] font-semibold border border-white/40 bg-transparent hover:bg-white/10 transition"
            style={{ borderRadius: 6, padding: "1px 6px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            Profili gör
          </Link>
        </div>

        {/* Title with "devamını oku" */}
        <div className="mb-1.5">
          <p
            ref={titleRef}
            className={`text-white text-[0.88rem] font-medium leading-snug ${expanded ? "" : "line-clamp-2"}`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            {moment.title}
          </p>
          {isClamped && !expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="text-white/70 text-[0.82rem] font-semibold mt-0.5 hover:text-white transition"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              devamını oku
            </button>
          )}
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-white/70 text-[0.82rem] font-semibold mt-0.5 hover:text-white transition"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              daha az
            </button>
          )}
        </div>

        {/* Tags — only shown when expanded */}
        {expanded && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {tags.map(tag => (
              <Link
                key={tag.id}
                href={`/dashboard/explore/tag/${tag.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[0.72rem] font-semibold text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full hover:bg-white/25 transition"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-20">
        <VideoProgressBar videoRef={videoRef} isActive={isActive} />
      </div>
    </div>
  );
});

function VideoProgressBar({ videoRef, isActive }: { videoRef: React.RefObject<HTMLVideoElement | null>; isActive: boolean }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const bar = barRef.current;
    if (!video || !bar || !isActive) return;

    let raf: number;
    const update = () => {
      if (video.duration) {
        bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [isActive]);

  return <div ref={barRef} className="h-full bg-white rounded-full" style={{ width: 0 }} />;
}
