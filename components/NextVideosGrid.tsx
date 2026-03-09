"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import VideoGridCard from "@/components/VideoGridCard";
import { getWatchedSlugs } from "@/lib/watchHistory";
import { useHydrated } from "@/lib/useHydrated";
import type { VideoItem } from "@/components/VideoSidebar";

interface NextVideosGridProps {
  videos: VideoItem[];
}

export default function NextVideosGrid({ videos }: NextVideosGridProps) {
  const t = useTranslations("post");
  const hydrated = useHydrated();

  const sorted = useMemo(() => {
    if (!hydrated) return videos;
    const watched = getWatchedSlugs();
    return [...videos].sort((a, b) => {
      const aW = watched.has(a.slug) ? 1 : 0;
      const bW = watched.has(b.slug) ? 1 : 0;
      return aW - bW;
    });
  }, [videos, hydrated]);

  if (sorted.length === 0) return null;

  return (
    <div className="xl:hidden mb-6 pt-3.5">
      <h3 className="text-[1.1rem] font-bold mb-4">{t("nextVideos")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
        {sorted.map(video => (
          <VideoGridCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
