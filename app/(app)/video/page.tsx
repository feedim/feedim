"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import Link from "next/link";

import ColumnHeader from "@/components/ColumnHeader";
import MomentsCarousel from "@/components/MomentsCarousel";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import VideoGridCard from "@/components/VideoGridCard";
import type { VideoGridItem } from "@/components/VideoGridCard";
import { fetchWithCache, readCache } from "@/lib/fetchWithCache";
import { useAuthModal } from "@/components/AuthModal";
import { isBlockedContent } from "@/lib/blockedWords";

type VideoPost = VideoGridItem & { like_count?: number };

const VIDEO_URL = "/api/posts/feed?tab=videos&page=1";

export default function VideoPage() {
  useSearchParams();
  const t = useTranslations("video");
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { requireAuth } = useAuthModal();

  // Read cache before first paint — avoids skeleton flash for cached data
  useLayoutEffect(() => {
    const cached = readCache(VIDEO_URL) as any;
    if (cached?.posts?.length) {
      setVideos(cached.posts);
      setLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    try {
      const data = await fetchWithCache(
        `/api/posts/feed?tab=videos&page=${pageNum}`,
        { ttlSeconds: 30, forceRefresh: pageNum > 1 }
      ) as any;
      const posts = data.posts || [];
      if (pageNum === 1) {
        setVideos(posts);
      } else {
        setVideos(prev => {
          const existingIds = new Set(prev.map(v => v.id));
          return [...prev, ...posts.filter((v: VideoPost) => !existingIds.has(v.id))];
        });
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos(1);
  }, [loadVideos]);

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setLoadingMore(true);
    await loadVideos(page + 1);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen">
      <ColumnHeader />
      {/* Moments (Shorts) carousel */}
      <MomentsCarousel maxItems={8} noBg />

      <div className="pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-7 p-4 sm:p-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i}>
                <div className="aspect-video rounded-xl bg-bg-secondary mb-3" />
                <div className="flex gap-3 px-0.5">
                  <div className="h-10 w-10 rounded-full bg-bg-secondary shrink-0" />
                  <div className="flex-1 min-w-0 space-y-[6px] pt-0.5">
                    <div className="h-[11px] w-[80%] bg-bg-secondary rounded-[5px] animate-pulse" />
                    <div className="h-[9px] w-24 bg-bg-secondary rounded-[5px] animate-pulse" />
                    <div className="h-[9px] w-16 bg-bg-secondary rounded-[5px] animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : videos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-7 p-4 sm:p-6">
              {videos.filter(video => !isBlockedContent(`${video.title || ""}`, video.profiles?.user_id)).map(video => (
                <VideoGridCard key={video.id} video={video} />
              ))}
            </div>
            <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
          </>
        ) : (
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        )}
      </div>
    </div>
  );
}
