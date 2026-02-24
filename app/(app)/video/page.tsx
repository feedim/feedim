"use client";

import { useSearchParams } from "next/navigation";

import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import ColumnHeader from "@/components/ColumnHeader";
import MomentsCarousel from "@/components/MomentsCarousel";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import VideoGridCard from "@/components/VideoGridCard";
import type { VideoGridItem } from "@/components/VideoGridCard";
import { fetchWithCache, readCache } from "@/lib/fetchWithCache";
import { useAuthModal } from "@/components/AuthModal";

type VideoPost = VideoGridItem & { like_count?: number };

const VIDEO_URL = "/api/posts/explore?content_type=video&sort=latest&page=1";

export default function VideoPage() {
  useSearchParams();
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
        `/api/posts/explore?content_type=video&sort=latest&page=${pageNum}`,
        { ttlSeconds: 30, forceRefresh: pageNum > 1 }
      ) as any;
      const posts = data.posts || [];
      if (pageNum === 1) {
        setVideos(posts);
      } else {
        setVideos(prev => [...prev, ...posts]);
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
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : videos.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-7 p-4 sm:p-6">
              {videos.map(video => (
                <VideoGridCard key={video.id} video={video} />
              ))}
            </div>
            <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
          </>
        ) : (
          <EmptyState
            icon={<Film className="h-12 w-12" />}
            title="Henüz video yok"
            description="İlk videoyu yükleyerek başlayabilirsiniz."
            action={{ label: "Video Yükle", href: "/create/video" }}
          />
        )}
      </div>
    </div>
  );
}
