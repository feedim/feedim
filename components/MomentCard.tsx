"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, MoreHorizontal, Music, Clock } from "lucide-react";
import { formatCount, formatRelativeDate } from "@/lib/utils";
import { encodeId } from "@/lib/hashId";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import ShareIcon from "@/components/ShareIcon";
import VideoPlayer from "@/components/VideoPlayer";
import { useTranslations } from "next-intl";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";
import LazyAvatar from "@/components/LazyAvatar";


interface MomentCardProps {
  moment: {
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
    published_at?: string;
    is_nsfw?: boolean;
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
  };
  isActive?: boolean;
  loadVideo?: boolean;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onOptions?: () => void;
  onLikesClick?: () => void;
  liked?: boolean;
  saved?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  preloadHint?: "auto" | "metadata";
  viewportHeight?: string;
}

export default memo(function MomentCard({ moment, isActive = false, loadVideo = true, onLike, onComment, onShare, onSave, onOptions, onLikesClick, liked = false, saved = false, muted = true, onToggleMute, preloadHint, viewportHeight }: MomentCardProps) {
  const t = useTranslations("tooltip");
  const tPost = useTranslations("post");
  const tc = useTranslations("common");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Cleanup audio on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, []);

  const [paused, setPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const playIconTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const author = moment.profiles;
  const tags = (moment.post_tags || []).map(pt => pt.tags).filter(Boolean);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);
  const displayLikeCount = Math.max(moment.like_count || 0, liked ? 1 : 0);
  const displaySaveCount = Math.max(moment.save_count || 0, saved ? 1 : 0);
  const h = viewportHeight || "100dvh";
  const viewportHeightStyle = { height: h, minHeight: h, maxHeight: h } as const;

  // Sound state — external if sound exists, is active, and audio differs from video
  const hasExternalSound = !!moment.sounds && moment.sounds.status === "active" && moment.sounds.audio_url !== moment.video_url;
  const soundMuted = moment.sounds?.status === "muted";
  const effectiveMuted = hasExternalSound || soundMuted || muted;

  // Check if title is clamped or has tags (show "read more" for both)
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const updateClamp = () => {
      setIsClamped(el.scrollHeight > el.clientHeight || tags.length > 0);
    };
    const frame = requestAnimationFrame(updateClamp);
    const observer = new ResizeObserver(updateClamp);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [tags.length]);

  // Sync volume to video/audio elements
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (hasExternalSound) {
      // External sound: mute video original audio completely, play external audio
      if (video) { video.muted = true; video.volume = 0; }
      if (audio) { audio.muted = muted; audio.volume = muted ? 0 : 1; }
    } else if (!soundMuted) {
      if (video) { video.muted = muted; video.volume = muted ? 0 : 1; }
    }
  }, [muted, hasExternalSound, soundMuted]);

  // Auto play/pause based on visibility (play/pause delegated to VideoPlayer via externalPaused)
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (isActive) {
      // Reset playback position
      if (video) video.currentTime = 0;
      // Start external audio
      if (hasExternalSound && audio) {
        audio.currentTime = 0;
        audio.loop = true;
        audio.play().catch(() => {});
      }
      const frame = requestAnimationFrame(() => setPaused(false));
      return () => {
        cancelAnimationFrame(frame);
        audioRef.current?.pause();
      };
    } else {
      audio?.pause();
      const frame = requestAnimationFrame(() => setExpanded(false));
      return () => cancelAnimationFrame(frame);
    }
  }, [isActive, hasExternalSound]);

  // Pause/resume audio on tab visibility change
  useEffect(() => {
    if (!isActive || !hasExternalSound) return;
    const onVisChange = () => {
      const audio = audioRef.current;
      if (!audio) return;
      if (document.hidden) {
        audio.pause();
      } else if (!paused) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [isActive, hasExternalSound, paused]);

  // Keep UI in sync with actual video state (keyboard/headset/OS controls)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setPaused(false);
      setShowPlayIcon(false);
    };
    const onPause = () => {
      setPaused(true);
      setShowPlayIcon(true);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (paused) {
      // Resuming — VideoPlayer reacts to externalPaused changing to false
      if (hasExternalSound && audio) audio.play().catch(() => {});
      setPaused(false);
      clearTimeout(playIconTimer.current);
      setShowPlayIcon(true);
      playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 800);
    } else {
      // Pausing — VideoPlayer reacts to externalPaused changing to true
      if (hasExternalSound && audio) audio.pause();
      setPaused(true);
      clearTimeout(playIconTimer.current);
      setShowPlayIcon(true);
    }
  }, [hasExternalSound, paused]);

  // Shorts-style keyboard controls (active card only) — capture phase for priority over GlobalHotkeys
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      // Skip when a modal is open — let modal handle its own keyboard events
      if (document.querySelector("[data-modal]")) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      // Skip if modifier keys held (allow Cmd/Ctrl combos through)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const video = videoRef.current;
      if (!video) return;

      const key = e.key.toLowerCase();
      // Prevent Tab from moving focus out of the player to description
      if (key === "tab") { e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (key === " " || key === "k") {
        e.preventDefault(); e.stopImmediatePropagation();
        togglePlayPause();
        return;
      }
      if (key === "m") {
        e.preventDefault(); e.stopImmediatePropagation();
        onToggleMute?.();
        return;
      }
      if (key === "arrowleft" || key === "j") {
        e.preventDefault(); e.stopImmediatePropagation();
        video.currentTime = Math.max(0, video.currentTime - 5);
        return;
      }
      if (key === "arrowright" || key === "l") {
        e.preventDefault(); e.stopImmediatePropagation();
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
        return;
      }
      if (key === "arrowup") {
        e.preventDefault(); e.stopImmediatePropagation();
        video.volume = Math.min(1, (video.volume || 0) + 0.05);
        return;
      }
      if (key === "arrowdown") {
        e.preventDefault(); e.stopImmediatePropagation();
        video.volume = Math.max(0, (video.volume || 0) - 0.05);
        return;
      }
      if (key === "f") {
        e.preventDefault(); e.stopImmediatePropagation();
        const el = cardRef.current || video;
        if (!document.fullscreenElement && el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true } as EventListenerOptions);
  }, [isActive, onToggleMute, togglePlayPause]);

  return (
    <div
      ref={cardRef}
      className="relative w-full bg-black md:h-screen"
      data-moment-active={isActive ? "true" : undefined}
      style={{ ...viewportHeightStyle, contentVisibility: isActive ? "visible" : "auto", containIntrinsicSize: `${h} 100vw` }}
    >
      {/* Full-screen video */}
      <div className="absolute inset-0" onClick={togglePlayPause}>
        <VideoPlayer
          ref={videoRef}
          src={loadVideo ? (moment.video_url || "") : ""}
          hlsUrl={loadVideo ? (moment.hls_url || undefined) : undefined}
          poster={moment.video_thumbnail || moment.featured_image}
          moment
          loop
          externalMuted={effectiveMuted}
          externalPaused={!isActive || paused}
          videoClassName="absolute inset-0 w-full h-full object-cover"
          preloadHint={preloadHint}
        />

        {/* Hidden audio element for external sound */}
        {hasExternalSound && moment.sounds && (
          <audio ref={audioRef} src={loadVideo ? moment.sounds.audio_url : undefined} loop preload={loadVideo ? (preloadHint || "auto") : "none"} />
        )}

        {/* Play/Pause indicator */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <svg
              viewBox="0 0 24 24"
              className="h-18 w-18 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] ml-1"
              aria-hidden="true"
            >
              <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Right side action buttons — TikTok/Reels style */}
      <div className="absolute right-1 bottom-4 z-20 flex flex-col items-center gap-4 touch-manipulation select-none">
        {/* Like */}
        <div className="flex flex-col items-center gap-0.5" style={{ rowGap: 2 }}>
          <button onClick={(e) => { e.stopPropagation(); onLike?.(); }} data-hotkey="like" aria-label={t("like")} data-tooltip={t("like")} data-tooltip-pos="left" className="active:scale-90 transition-transform">
            <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              <Heart strokeWidth={1.7} className={`h-[27px] w-[27px] md:h-[23px] md:w-[23px] transition-transform ${liked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
            </div>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onLikesClick?.(); }}
            className="text-white text-[0.68rem] leading-none font-semibold active:scale-95 transition-transform"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
          >
            {formatCount(displayLikeCount)}
          </button>
        </div>

        {/* Comment */}
        <button onClick={(e) => { e.stopPropagation(); onComment?.(); }} data-hotkey="comments" aria-label={t("comment")} data-tooltip={t("comment")} data-tooltip-pos="left" className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform" style={{ rowGap: 2 }}>
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            <MessageCircle strokeWidth={1.7} className="h-[27px] w-[27px] md:h-[23px] md:w-[23px] text-white" />
          </div>
          <span className="text-white text-[0.68rem] leading-none font-semibold" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.comment_count || 0)}
          </span>
        </button>

        {/* Save */}
        <button onClick={(e) => { e.stopPropagation(); onSave?.(); }} data-hotkey="save" aria-label={t("save")} data-tooltip={t("save")} data-tooltip-pos="left" className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform" style={{ rowGap: 2 }}>
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            <Bookmark strokeWidth={1.7} className={`h-[27px] w-[27px] md:h-[23px] md:w-[23px] transition-transform ${saved ? "fill-white text-white scale-110" : "text-white"}`} />
          </div>
          <span className="text-white text-[0.68rem] leading-none font-semibold" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
            {formatCount(displaySaveCount)}
          </span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); onShare?.(); }} data-hotkey="share" aria-label={t("share")} data-tooltip={t("share")} data-tooltip-pos="left" className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform" style={{ rowGap: 2 }}>
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            <ShareIcon strokeWidth={1.7} className="h-[27px] w-[27px] md:h-[23px] md:w-[23px] text-white" />
          </div>
          <span className="text-white text-[0.68rem] leading-none font-semibold" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.share_count || 0)}
          </span>
        </button>

        {/* Options */}
        <button onClick={(e) => { e.stopPropagation(); onOptions?.(); }} aria-label={t("options")} data-tooltip={t("options")} data-tooltip-pos="left" className="flex flex-col items-center active:scale-90 transition-transform">
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
            <MoreHorizontal strokeWidth={1.7} className="h-[27px] w-[27px] md:h-[23px] md:w-[23px] text-white" />
          </div>
        </button>
      </div>

      {/* Bottom — author info + title + tags + sound */}
      <div className="absolute bottom-4 left-4 right-[56px] z-20">
        {/* NSFW under review badge — above name */}
        {moment.is_nsfw && (
          <div className="mb-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.7rem] font-semibold bg-[var(--accent-color)]/20 text-[var(--accent-color)]">
            <Clock size={11} />
            <span>{tPost("underReview")}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-1.5">
          <Link href={`/u/${author?.username}`} className="flex items-center gap-2 min-w-0">
            <LazyAvatar src={moment.profiles?.avatar_url} alt={moment.profiles?.username || ""} sizeClass="h-9 w-9" borderClass="border border-white/10" />
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white font-medium truncate" style={{ fontSize: "0.84rem", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
                @{author?.username}
              </span>
              {(author?.is_verified || author?.role === "admin") && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} className="!w-3.5 !h-3.5 !min-w-[14px]" />}
            </div>
          </Link>
          <Link
            href={`/u/${author?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-white text-[0.62rem] font-semibold border border-white/20 bg-transparent hover:bg-white/10 transition"
            style={{ borderRadius: 6, padding: "0 6px", textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
          >
            {tc("viewProfile")}
          </Link>
        </div>

        {/* Title with "devamını oku" */}
        <div>
          <p
            ref={titleRef}
            className={`text-white text-[0.82rem] font-medium leading-snug ${expanded ? "" : "line-clamp-2"}`}
            style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
            dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(moment.title) }}
          />
          {isClamped && !expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="text-white/70 text-[0.82rem] font-semibold hover:text-white transition"
              style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
            >
              {tc("readMoreShort")}
            </button>
          )}
          {expanded && moment.published_at && (
            <p className="text-white/50 text-[0.7rem] font-medium mt-0.5" style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}>
              {formatRelativeDate(moment.published_at)}
            </p>
          )}
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-white/70 text-[0.82rem] font-semibold hover:text-white transition"
              style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
            >
              {tc("showLess")}
            </button>
          )}
        </div>

        {/* Tags — only shown when expanded */}
        {expanded && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {tags.map(tag => (
              <Link
                key={tag.id}
                href={`/explore/tag/${tag.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[0.72rem] font-semibold text-white/80 bg-white/15 backdrop-blur-sm px-2 py-0.5 rounded-full hover:bg-white/25 transition"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Sound marquee — TikTok/Reels style */}
        {moment.sounds && moment.sounds.status !== "muted" && (
          <Link
            href={`/sounds/${encodeId(moment.sounds.id)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 mt-[5px]"
          >
            <Music className="h-3 w-3 text-white/80 shrink-0" />
            <div className="overflow-hidden max-w-[200px]">
              <span
                className="text-white/90 text-[0.68rem] font-medium whitespace-nowrap animate-marquee"
                style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
              >
                {moment.sounds.title}{moment.sounds.artist ? ` \u00B7 ${moment.sounds.artist}` : ""}
              </span>
            </div>
          </Link>
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
