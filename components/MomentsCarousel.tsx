"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import BlurImage from "@/components/BlurImage";
import LazyAvatar from "@/components/LazyAvatar";

interface MomentItem {
  id: number;
  title: string;
  slug: string;
  video_url?: string;
  video_thumbnail?: string;
  featured_image?: string;
  blurhash?: string | null;
  video_duration?: number;
  profiles?: {
    user_id: string;
    username: string;
    full_name?: string;
    name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
}

const EMPTY_MOMENTS: MomentItem[] = [];

export default function MomentsCarousel({
  maxItems = 4,
  noBg = false,
  initialMoments,
  feedMode = "for-you",
}: {
  maxItems?: number;
  noBg?: boolean;
  initialMoments?: MomentItem[];
  feedMode?: "for-you" | "following";
}) {
  const t = useTranslations("moments");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const seededMoments = initialMoments ?? EMPTY_MOMENTS;
  const hasInitialMoments = seededMoments.length > 0;
  const [moments, setMoments] = useState<MomentItem[]>(seededMoments);
  const [loaded, setLoaded] = useState(hasInitialMoments);
  const mountTs = useRef(Date.now());

  const loadMoments = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/moments?limit=${maxItems}&locale=${locale}&tab=${feedMode}&_t=${mountTs.current}`);
      const data = await res.json() as { moments?: MomentItem[] };
      setMoments((data.moments || []).slice(0, maxItems));
    } catch {
      // Silent
    } finally {
      setLoaded(true);
    }
  }, [feedMode, maxItems, locale]);

  useEffect(() => {
    mountTs.current = Date.now();
    if (hasInitialMoments && feedMode === "for-you") {
      setMoments(seededMoments);
      setLoaded(true);
      return;
    }
    setMoments(EMPTY_MOMENTS);
    setLoaded(false);
  }, [feedMode, hasInitialMoments, seededMoments]);

  useEffect(() => {
    if (!loaded) void loadMoments();
  }, [loaded, loadMoments]);

  useEffect(() => {
    if (!loaded) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: 0, behavior: "auto" });
  }, [loaded, moments.length]);


  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!loaded) return (
    <div className={cn("sm:mx-3 my-3 py-3 rounded-[16px] select-none", !noBg && "bg-bg-secondary")} style={{ marginLeft: 11, marginRight: 11 }}>
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-[0.88rem] font-bold">{t("title")}</span>
      </div>
      <div className="flex gap-2.5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "shrink-0 w-[130px] h-[230px] rounded-[14px]",
              i === 0 && "ml-[10px]",
              i === 4 && "mr-[10px]",
              noBg ? "bg-bg-secondary" : "bg-bg-tertiary"
            )}
          />
        ))}
      </div>
    </div>
  );

  if (moments.length === 0) return null;

  return (
    <div className={cn("sm:mx-3 my-3 py-3 rounded-[16px] select-none", !noBg && "bg-bg-secondary")} style={{ marginLeft: 11, marginRight: 11 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-[0.88rem] font-bold">{t("title")}</span>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        dir="ltr"
        className="flex w-full items-stretch justify-start gap-2.5 overflow-x-auto overscroll-x-contain scrollbar-hide touch-pan-x"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollPaddingLeft: "10px",
          scrollPaddingRight: "10px",
        }}
      >
        {moments.map((m, index) => {
          const author = m.profiles;
          const thumb = m.video_thumbnail || m.featured_image;
          return (
            <Link
              key={m.id}
              href={`/moments?s=${m.slug}`}
              className={cn(
                "relative flex flex-col shrink-0 w-[130px] h-[230px] rounded-[14px] overflow-hidden bg-bg-tertiary",
                index === 0 && "ml-[10px]"
              )}
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Thumbnail only (no autoplay for performance) */}
              {thumb ? (
                <BlurImage src={thumb} alt="" className="absolute inset-0 w-full h-full" blurhash={m.blurhash} />
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
                  <LazyAvatar src={m.profiles?.avatar_url} alt={m.profiles?.username || ""} sizeClass="w-5 h-5" borderClass="" />
                  <span className="text-[0.65rem] text-white font-medium truncate flex items-center gap-0.5">
                    @{author?.username}
                    {(author?.is_verified || author?.role === "admin") && <VerifiedBadge size="sm" variant={getBadgeVariant(author?.premium_plan)} role={author?.role} />}
                  </span>
                </div>
                <p className="text-[0.6rem] text-white font-medium line-clamp-2" style={{ lineHeight: 1.35 }}>{m.title}</p>
              </div>
            </Link>
          );
        })}

        {/* "See all" card */}
        <Link
          href="/moments"
          className="mr-[10px] flex flex-col items-center justify-center shrink-0 w-[100px] h-[230px] rounded-[14px] bg-bg-tertiary hover:bg-bg-tertiary/80 transition"
          style={{ scrollSnapAlign: "start" }}
        >
          <div className="w-12 h-12 rounded-full bg-bg-secondary flex items-center justify-center mb-2">
            <ChevronRight className="h-5 w-5 text-text-muted" />
          </div>
          <p className="text-[0.75rem] font-semibold text-text-muted">{tCommon("seeAll")}</p>
        </Link>
      </div>
    </div>
  );
}
