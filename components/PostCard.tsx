"use client";

import { memo, useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copyright } from "lucide-react";
import NoImage from "@/components/NoImage";
import BlurImage from "@/components/BlurImage";
import { formatRelativeDate, formatCount } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import ModerationBadge from "@/components/ModerationBadge";
import PostHeaderActions from "@/components/PostHeaderActions";

interface PostCardProps {
  post: {
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
    featured_image?: string;
    reading_time?: number;
    like_count?: number;
    comment_count?: number;
    view_count?: number;
    content_type?: string;
    video_duration?: number;
    video_thumbnail?: string;
    video_url?: string;
    blurhash?: string | null;
    published_at?: string;
    is_nsfw?: boolean;
    moderation_category?: string | null;
    profiles?: {
      user_id: string;
      name?: string;
      surname?: string;
      full_name?: string;
      username: string;
      avatar_url?: string;
      is_verified?: boolean;
      premium_plan?: string | null;
      role?: string;
    };
  };
}

export default memo(function PostCard({ post }: PostCardProps) {
  const author = post.profiles;
  const hasThumbnail = !!(post.video_thumbnail || post.featured_image);
  const isVideo = post.content_type === "video" || post.content_type === "moment";
  const canPreview = isVideo && !!post.video_url;
  const router = useRouter();

  const [inView, setInView] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // IntersectionObserver — start preview when thumbnail enters viewport
  useEffect(() => {
    if (!canPreview) return;
    const el = thumbRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          setShowCTA(false);
          setVideoReady(false);
          timerRef.current = setTimeout(() => {
            setShowCTA(true);
            videoRef.current?.pause();
          }, 20000);
        } else {
          setInView(false);
          setShowCTA(false);
          setVideoReady(false);
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = undefined;
          }
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [canPreview]);

  const handleVideoEnded = useCallback(() => {
    setShowCTA(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const thumbnail = post.video_thumbnail || post.featured_image;

  return (
    <article className="pt-[4px] pb-[9px] pl-3 pr-3.5 mx-[3px] sm:mx-[12px] mb-3 sm:mb-[20px] hover:bg-bg-secondary rounded-[24px] transition-colors overflow-hidden">
      <div className="flex gap-2 items-stretch">
        {/* Avatar — fixed left column with timeline line */}
        <div className="shrink-0 w-[42px] pt-[11px] pb-0 flex flex-col items-center">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt={author?.username || ""} className="h-[42px] w-[42px] min-w-[42px] max-w-[42px] rounded-full object-cover relative z-[1]" loading="lazy" />
          ) : (
            <div className="h-[42px] w-[42px] min-w-[42px] max-w-[42px] rounded-full overflow-hidden relative z-[1]">
              <img className="default-avatar-auto h-full w-full rounded-full object-cover" alt="" loading="lazy" />
            </div>
          )}
          <div className="flex-1 w-px mt-1" style={{ backgroundColor: "var(--border-primary)" }} />
        </div>

        {/* Content — right side, clickable */}
        <div className="flex-1 min-w-0 relative flex flex-col gap-0 rounded-[21px] p-[5px]">
          <Link href={`/post/${post.slug}`} className="absolute inset-0 z-0 rounded-[21px]" />
          {/* Name row */}
          <div className="flex items-center justify-between relative z-[1] pointer-events-none">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[0.84rem] font-semibold truncate">{author?.username || "Anonim"}</span>
              {author?.is_verified && <VerifiedBadge variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
              {post.published_at && (
                <>
                  <span className="text-text-muted/40 text-xs">·</span>
                  <span className="text-[0.62rem] text-text-muted shrink-0">{formatRelativeDate(post.published_at)}</span>
                </>
              )}
            </div>
            <div className="pointer-events-auto shrink-0 -mr-2 [&_button]:!w-7 [&_button]:!h-7 [&_svg]:!h-4 [&_svg]:!w-4">
              <PostHeaderActions
                postId={post.id}
                postUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/post/${post.slug}`}
                postTitle={post.title}
                authorUsername={author?.username}
                authorUserId={author?.user_id}
                authorName={author?.full_name || author?.username}
                postSlug={post.slug}
                contentType={post.content_type as "post" | "video" | "moment" | undefined}
              />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-[1.12rem] font-semibold leading-snug text-text-primary line-clamp-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-[0.8rem] text-text-muted leading-relaxed line-clamp-2 mt-0.5">
              {post.excerpt}
            </p>
          )}

          {/* Thumbnail */}
          <div
            ref={thumbRef}
            className="mt-2 rounded-[21px] overflow-hidden bg-bg-tertiary cursor-pointer relative z-[1]"
            onClick={() => router.push(`/post/${post.slug}`)}
          >
            <div className="relative w-full" style={{ aspectRatio: isVideo ? "16/9" : "4/3" }}>
              {hasThumbnail ? (
                <BlurImage
                  src={(post.video_thumbnail || post.featured_image)!}
                  alt={post.title}
                  className="w-full h-full"
                  blurhash={post.blurhash}
                />
              ) : (
                <NoImage className="w-full h-full" iconSize={28} />
              )}

              {/* Video preview — plays when card scrolls into view */}
              {inView && canPreview && (
                <>
                  <video
                    ref={videoRef}
                    src={post.video_url}
                    muted
                    autoPlay
                    playsInline
                    poster={thumbnail}
                    onCanPlay={() => setVideoReady(true)}
                    onEnded={handleVideoEnded}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${videoReady ? "opacity-100" : "opacity-0"}`}
                  />
                  {/* Loading spinner */}
                  {!videoReady && (
                    <div className="absolute inset-0 flex items-center justify-center z-[2]">
                      <div className="w-6 h-6 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {/* CTA overlay */}
                  {showCTA && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[3]">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/post/${post.slug}`);
                        }}
                        className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors relative z-[4] pointer-events-auto"
                      >
                        İzlemeye Devam Et
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Play icon (show when not previewing) */}
              {isVideo && hasThumbnail && !inView && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <svg className="h-4 w-4 text-white ml-0.5" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              )}
              {isVideo && (
                <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md">
                  {post.video_duration ? `${Math.floor(post.video_duration / 60)}:${(post.video_duration % 60).toString().padStart(2, "0")}` : (post.content_type === "moment" ? "Moment" : "Video")}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mt-2 text-[0.72rem] text-text-muted">
            <span>{formatCount(post.view_count || 0)} görüntülenme</span>
            <span className="text-text-muted/60">{post.content_type === "moment" ? "Moment" : post.content_type === "video" ? "Video" : "Gönderi"}</span>
          </div>

          {/* NSFW moderation badge */}
          {post.is_nsfw && (
            <ModerationBadge label="Gönderi incelemede..." className="mt-2" />
          )}

          {/* Copyright badge */}
          {!post.is_nsfw && (post.moderation_category === 'copyright' || post.moderation_category === 'kopya_icerik') && (
            <div className="flex items-center gap-1 text-warning text-xs mt-1">
              <Copyright size={12} />
              <span>{post.moderation_category === 'kopya_icerik' ? 'Kopya içerik bildirimi' : 'Telif hakkı bildirimi'}</span>
            </div>
          )}
        </div>
      </div>

    </article>
  );
});
