"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import Link from "next/link";
import { redirectToLogin } from "@/lib/loginNext";

import ColumnHeader from "@/components/ColumnHeader";
import MomentsCarousel from "@/components/MomentsCarousel";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import VideoGridCard from "@/components/VideoGridCard";
import type { VideoGridItem } from "@/components/VideoGridCard";
import FeedFilterSelect from "@/components/FeedFilterSelect";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";
import { useAuthModal } from "@/components/AuthModal";
import { isBlockedContent } from "@/lib/blockedWords";
import { useUser } from "@/components/UserContext";

type VideoPost = VideoGridItem & { like_count?: number };
type FeedMode = "for-you" | "following";

export default function VideoPage() {
  useSearchParams();
  const t = useTranslations("video");
  const tExplore = useTranslations("explore");
  const tFeed = useTranslations("feed");
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const { requireAuth } = useAuthModal();
  const { user: currentUser, isLoggedIn } = useUser();
  const cacheScope = currentUser?.id ? `user:${currentUser.id}:video-feed` : "guest:video-feed";
  const filterOptions = [
    { id: "for-you", label: tFeed("forYou") },
    { id: "following", label: tFeed("following") },
  ];

  const getVideoUrl = useCallback((pageNum: number, mode: FeedMode = feedMode) => {
    const baseUrl = mode === "following"
      ? `/api/posts/feed?tab=following&content_type=video&page=${pageNum}`
      : `/api/posts/feed?tab=videos&page=${pageNum}`;
    return withCacheScope(baseUrl, cacheScope);
  }, [cacheScope, feedMode]);

  // Read cache before first paint — avoids skeleton flash for cached data
  useLayoutEffect(() => {
    const cached = readCache(getVideoUrl(1, feedMode)) as any;
    if (cached?.posts?.length) {
      setVideos(cached.posts);
      setLoading(false);
    }
  }, [feedMode, getVideoUrl]);

  const loadVideos = useCallback(async (pageNum: number, mode: FeedMode = feedMode) => {
    if (pageNum === 1) setLoading(true);
    try {
      const data = await fetchWithCache(
        getVideoUrl(pageNum, mode),
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
  }, [feedMode, getVideoUrl]);

  useEffect(() => {
    setVideos([]);
    setHasMore(false);
    setPage(1);
    setLoading(true);
    void loadVideos(1, feedMode);
  }, [feedMode, loadVideos]);

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setLoadingMore(true);
    await loadVideos(page + 1, feedMode);
    setLoadingMore(false);
  };

  const handleFeedModeChange = (nextValue: string) => {
    const nextMode = nextValue as FeedMode;
    if (nextMode === "following" && !isLoggedIn) {
      redirectToLogin();
      return;
    }
    setFeedMode(nextMode);
  };

  return (
    <div className="min-h-screen">
      <ColumnHeader
        rightAction={
          <FeedFilterSelect
            value={feedMode}
            options={filterOptions}
            onChange={handleFeedModeChange}
            modalTitle={tExplore("filter")}
          />
        }
      />
      {/* Moments (Shorts) carousel */}
      <MomentsCarousel maxItems={8} noBg feedMode={feedMode} />

      <div className="pb-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-7 p-4 sm:p-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i}>
                <div className="aspect-video rounded-xl bg-bg-secondary mb-3 animate-pulse" />
                <div className="flex gap-3 px-0.5">
                  <div className="h-10 w-10 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
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
