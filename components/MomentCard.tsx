"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Bookmark, Volume2, VolumeX, MoreHorizontal, Music } from "lucide-react";
import { formatCount, encodeId } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import ShareIcon from "@/components/ShareIcon";
import VideoPlayer from "@/components/VideoPlayer";
import { useTranslations } from "next-intl";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";

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
}

export default memo(function MomentCard({ moment, isActive = false, loadVideo = false, onLike, onComment, onShare, onSave, onOptions, onLikesClick, liked = false, saved = false, muted = true, onToggleMute, preloadHint }: MomentCardProps) {
  const t = useTranslations("tooltip");
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const playIconTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const author = moment.profiles;
  const tags = (moment.post_tags || []).map(pt => pt.tags).filter(Boolean);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  // Sound state
  const hasExternalSound = !!moment.sounds && !moment.sounds.is_original && moment.sounds.status === "active";
  const soundMuted = moment.sounds?.status === "muted";
  const effectiveMuted = soundMuted || muted;

  // Check if title is clamped or has tags (show "devamını oku" for both)
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight || tags.length > 0);
  }, [moment.title, tags.length]);

  // Sync volume to video/audio elements (muted attribute handled by VideoPlayer's externalMuted)
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (hasExternalSound) {
      // External sound: video volume low, audio full
      if (video) video.volume = muted ? 0 : 0.15;
      if (audio) { audio.muted = muted; audio.volume = muted ? 0 : 1; }
    } else if (!soundMuted) {
      if (video) video.volume = 1;
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
      setPaused(false);
    } else {
      audio?.pause();
      setExpanded(false);
    }
  }, [isActive, hasExternalSound]);

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

  // Shorts-style keyboard controls (active card only)
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      const key = e.key.toLowerCase();
      // Prevent Tab from moving focus out of the player to description
      if (key === "tab") { e.preventDefault(); return; }
      if (key === " " || key === "k") {
        e.preventDefault();
        togglePlayPause();
        return;
      }
      if (key === "m") {
        e.preventDefault();
        onToggleMute?.();
        return;
      }
      if (key === "arrowleft" || key === "j") {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        return;
      }
      if (key === "arrowright" || key === "l") {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 5);
        return;
      }
      if (key === "arrowup") {
        e.preventDefault();
        video.volume = Math.min(1, (video.volume || 0) + 0.05);
        return;
      }
      if (key === "arrowdown") {
        e.preventDefault();
        video.volume = Math.max(0, (video.volume || 0) - 0.05);
        return;
      }
      if (key === "f") {
        e.preventDefault();
        const el = cardRef.current || video;
        if (!document.fullscreenElement && el.requestFullscreen) {
          el.requestFullscreen().catch(() => {});
        } else if (document.fullscreenElement) {
          document.exitFullscreen?.();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isActive, onToggleMute, togglePlayPause]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleMute?.();
  }, [onToggleMute]);

  // Lightweight render for far-off cards to reduce scroll jank (Android)
  if (!loadVideo && !isActive) {
    return (
      <div
        ref={cardRef}
        className="relative h-[100svh] md:h-[100dvh] w-full bg-black snap-start snap-always"
        style={{ contentVisibility: "auto", containIntrinsicSize: "100svh 100vw" }}
      >
        {(moment.video_thumbnail || moment.featured_image) && (
          <img
            src={moment.video_thumbnail || moment.featured_image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="relative h-[100svh] md:h-[100dvh] w-full bg-black snap-start snap-always"
      data-moment-active={isActive ? "true" : undefined}
      style={{ contentVisibility: "auto", containIntrinsicSize: "100svh 100vw" }}
    >
      {/* Full-screen video */}
      <div className="absolute inset-0" onClick={togglePlayPause}>
        <VideoPlayer
          ref={videoRef}
          src={loadVideo ? (moment.video_url || "") : ""}
          hlsUrl={moment.hls_url || undefined}
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
          <audio ref={audioRef} src={moment.sounds.audio_url} loop preload={loadVideo ? (preloadHint || "auto") : "none"} />
        )}

        {/* Play/Pause indicator */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <svg
              viewBox="0 0 24 24"
              className="h-18 w-18 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] ml-1"
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

      {/* Mute button — top right */}
      <button
        onClick={toggleMute}
        aria-label={muted ? t("unmute") : t("mute")}
        className="absolute top-3 right-3 z-30 w-11 h-11 md:w-10 md:h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center touch-manipulation active:scale-90 transition-transform"
      >
        {muted ? <VolumeX className="h-5 w-5 text-white" /> : <Volume2 className="h-5 w-5 text-white" />}
      </button>

      {/* Right side action buttons — TikTok/Reels style */}
      <div className="absolute right-1 bottom-4 z-20 flex flex-col items-center gap-4 touch-manipulation">
        {/* Like */}
        <div className="flex flex-col items-center gap-0.5" style={{ rowGap: 2 }}>
          <button onClick={(e) => { e.stopPropagation(); onLike?.(); }} data-hotkey="like" aria-label={t("like")} className="active:scale-90 transition-transform">
            <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
              <Heart className={`h-[27px] w-[27px] md:h-[23px] md:w-[23px] transition-transform ${liked ? "fill-red-500 text-red-500 scale-110" : "text-white"}`} />
            </div>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onLikesClick?.(); }}
            className="text-white text-[0.68rem] leading-none font-semibold active:scale-95 transition-transform"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
          >
            {formatCount(moment.like_count || 0)}
          </button>
        </div>

        {/* Comment */}
        <button onClick={(e) => { e.stopPropagation(); onComment?.(); }} data-hotkey="comments" aria-label={t("comment")} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform" style={{ rowGap: 2 }}>
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            <MessageCircle className="h-[27px] w-[27px] md:h-[23px] md:w-[23px] text-white" />
          </div>
          <span className="text-white text-[0.68rem] leading-none font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.comment_count || 0)}
          </span>
        </button>

        {/* Save */}
        <button onClick={(e) => { e.stopPropagation(); onSave?.(); }} data-hotkey="save" aria-label={t("save")} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform" style={{ rowGap: 2 }}>
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            <Bookmark className={`h-[27px] w-[27px] md:h-[23px] md:w-[23px] transition-transform ${saved ? "fill-white text-white scale-110" : "text-white"}`} />
          </div>
          <span className="text-white text-[0.68rem] leading-none font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.save_count || 0)}
          </span>
        </button>

        {/* Share */}
        <button onClick={(e) => { e.stopPropagation(); onShare?.(); }} data-hotkey="share" aria-label={t("share")} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform" style={{ rowGap: 2 }}>
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            <ShareIcon className="h-[27px] w-[27px] md:h-[23px] md:w-[23px] text-white" />
          </div>
          <span className="text-white text-[0.68rem] leading-none font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
            {formatCount(moment.share_count || 0)}
          </span>
        </button>

        {/* Options */}
        <button onClick={(e) => { e.stopPropagation(); onOptions?.(); }} aria-label={t("options")} className="flex flex-col items-center active:scale-90 transition-transform">
          <div className="w-[43px] h-[43px] md:w-[39px] md:h-[39px] flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
            <MoreHorizontal className="h-[27px] w-[27px] md:h-[23px] md:w-[23px] text-white" />
          </div>
        </button>
      </div>

      {/* Bottom — author info + title + tags + sound */}
      <div className="absolute bottom-4 left-4 right-[56px] z-20">
        <div className="flex items-center gap-2 mb-1.5">
          <Link href={`/u/${author?.username}`} className="flex items-center gap-2 min-w-0">
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" loading="lazy" decoding="async" className="rounded-full object-cover border border-white/30 bg-bg-tertiary" style={{ width: 30, height: 30 }} />
            ) : (
              <img className="default-avatar-auto rounded-full object-cover border border-white/30" style={{ width: 30, height: 30 }} alt="" loading="lazy" />
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-white font-bold truncate" style={{ fontSize: "0.84rem", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
                @{author?.username}
              </span>
              {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} className="!w-3.5 !h-3.5 !min-w-[14px]" />}
            </div>
          </Link>
          <Link
            href={`/u/${author?.username}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-white text-[0.62rem] font-semibold border border-white/40 bg-transparent hover:bg-white/10 transition"
            style={{ borderRadius: 6, padding: "0 6px", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
          >
            Profili gör
          </Link>
        </div>

        {/* Title with "devamını oku" */}
        <div>
          <p
            ref={titleRef}
            className={`text-white text-[0.82rem] font-medium leading-snug ${expanded ? "" : "line-clamp-2"}`}
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(moment.title) }}
          />
          {isClamped && !expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              className="text-white/70 text-[0.82rem] font-semibold hover:text-white transition"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              devamını oku
            </button>
          )}
          {expanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              className="text-white/70 text-[0.82rem] font-semibold hover:text-white transition"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              daha az
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
            className="flex items-center gap-2"
          >
            <Music className="h-3 w-3 text-white/80 shrink-0" />
            <div className="overflow-hidden max-w-[200px]">
              <span
                className="text-white/90 text-[0.68rem] font-medium whitespace-nowrap animate-marquee"
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
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
