"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, ChevronRight } from "lucide-react";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

interface MomentItem {
  id: number;
  title: string;
  slug: string;
  video_url?: string;
  video_thumbnail?: string;
  featured_image?: string;
  video_duration?: number;
  profiles?: {
    user_id: string;
    username: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
  };
}

const DISMISS_KEY = "fdm-moments-carousel-dismissed";

export default function MomentsCarousel() {
  const [moments, setMoments] = useState<MomentItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }
    loadMoments();
  }, []);

  const loadMoments = useCallback(async () => {
    try {
      const res = await fetch("/api/posts/moments?limit=5");
      if (!res.ok) return;
      const data = await res.json();
      setMoments(data.moments || []);
    } catch {
      // Silent
    } finally {
      setLoaded(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (dismissed || !loaded || moments.length === 0) return null;

  return (
    <div className="mx-1 sm:mx-3 my-3 py-3 bg-bg-secondary rounded-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-[0.88rem] font-bold">Moments</span>
        <button
          onClick={handleDismiss}
          className="i-btn !w-7 !h-7 text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Horizontal scroll */}
      <div
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: "x mandatory", marginLeft: 10 }}
      >
        {moments.map((m) => {
          const author = m.profiles;
          const thumb = m.video_thumbnail || m.featured_image;
          return (
            <Link
              key={m.id}
              href={`/dashboard/moments?id=${m.id}`}
              className="relative flex flex-col shrink-0 w-[130px] h-[230px] rounded-[14px] overflow-hidden bg-black"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Video thumbnail or silent autoplay */}
              {m.video_url ? (
                <video
                  src={m.video_url}
                  poster={thumb}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : thumb ? (
                <img src={thumb} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="absolute inset-0 bg-bg-tertiary" />
              )}

              {/* Gradient overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

              {/* Duration badge */}
              {m.video_duration && m.video_duration > 0 && (
                <div className="absolute top-2 right-2 bg-black/60 text-white text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md">
                  {fmtDuration(m.video_duration)}
                </div>
              )}

              {/* Author info — bottom */}
              <div className="absolute bottom-2 left-2 right-2 z-10">
                <div className="flex items-center gap-1.5 mb-1">
                  {author?.avatar_url ? (
                    <img src={author.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-white/30" loading="lazy" />
                  ) : (
                    <img className="default-avatar-auto w-5 h-5 rounded-full object-cover border border-white/30" alt="" loading="lazy" />
                  )}
                  <span className="text-[0.65rem] text-white font-medium truncate flex items-center gap-0.5">
                    @{author?.username}
                    {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} />}
                  </span>
                </div>
                <p className="text-[0.68rem] text-white font-medium leading-tight line-clamp-2">{m.title}</p>
              </div>
            </Link>
          );
        })}

        {/* "See all" card */}
        <Link
          href="/dashboard/moments"
          className="flex flex-col items-center justify-center shrink-0 w-[100px] h-[230px] rounded-[14px] bg-bg-tertiary hover:bg-bg-tertiary/80 transition"
          style={{ scrollSnapAlign: "start" }}
        >
          <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center mb-2">
            <ChevronRight className="h-5 w-5 text-text-muted" />
          </div>
          <p className="text-[0.75rem] font-semibold text-text-muted">Tümünü gör</p>
        </Link>
      </div>
    </div>
  );
}
