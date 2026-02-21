"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Film } from "lucide-react";
import ColumnHeader from "@/components/ColumnHeader";
import MomentsCarousel from "@/components/MomentsCarousel";
import { VideoGridSkeleton } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import VideoGridCard from "@/components/VideoGridCard";
import type { VideoGridItem } from "@/components/VideoGridCard";
import { fetchWithCache } from "@/lib/fetchWithCache";

type VideoPost = VideoGridItem & { like_count?: number };

export default function VideoPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
    setLoadingMore(true);
    await loadVideos(page + 1);
    setLoadingMore(false);
  };

  return (
    <div className="min-h-screen">
      <ColumnHeader />
      {/* Moments (Shorts) carousel */}
      <MomentsCarousel maxItems={8} />

      <div className="pb-8">
        {loading ? (
          <div className="pt-4">
            <VideoGridSkeleton count={6} />
          </div>
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
            action={{ label: "Video Yükle", href: "/dashboard/write/video" }}
          />
        )}
      </div>
    </div>
  );
}
