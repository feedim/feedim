"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";

export default function PostsPage() {
  useSearchParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadPosts = useCallback(async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    try {
      const res = await fetch(`/api/posts/explore?content_type=article&sort=latest&page=${pageNum}`);
      const data = await res.json();
      const newPosts = data.posts || [];
      if (pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
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
    loadPosts(1);
  }, []);

  return (
    <AppLayout headerTitle="Gönderiler">
      <div className="px-2.5 sm:px-3">
        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : posts.length > 0 ? (
          <>
            <div className="flex flex-col gap-[40px]">
              {posts.map((post: any) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <LoadMoreTrigger
              onLoadMore={() => loadPosts(page + 1)}
              loading={loading}
              hasMore={hasMore}
            />
          </>
        ) : (
          <EmptyState
            title="Henüz gönderi yok"
            description="Henüz makale tipinde gönderi bulunmuyor."
          />
        )}
      </div>
    </AppLayout>
  );
}
