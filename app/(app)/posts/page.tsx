"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import { isBlockedContent } from "@/lib/blockedWords";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";

export default function PostsPage() {
  useSearchParams();
  const t = useTranslations("nav");
  const tExplore = useTranslations("explore");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { user: currentUser } = useUser();
  const { requireAuth } = useAuthModal();
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean; saved: boolean }>>({});
  const fetchedInteractionIds = useRef(new Set<number>());
  const cacheScope = currentUser?.id ? `user:${currentUser.id}:pi2` : "guest:pi2";

  const getPostsUrl = useCallback((pageNum: number) => (
    withCacheScope(`/api/posts/feed?tab=posts&page=${pageNum}`, cacheScope)
  ), [cacheScope]);

  useLayoutEffect(() => {
    const cached = readCache(getPostsUrl(1)) as any;
    if (!cached?.posts) return;
    setPosts(cached.posts || []);
    setHasMore(cached.hasMore || false);
    setPage(1);
    setLoading(false);
  }, [getPostsUrl]);

  const loadPosts = useCallback(async (pageNum: number) => {
    const url = getPostsUrl(pageNum);
    if (pageNum === 1) {
    }
    else setLoadingMore(true);
    try {
      const data = await fetchWithCache(url, { ttlSeconds: 30, forceRefresh: pageNum > 1 }) as any;
      const newPosts = data.posts || [];
      if (pageNum === 1) {
        setPosts(newPosts);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...newPosts.filter((p: any) => !existingIds.has(p.id))];
        });
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [getPostsUrl]);

  useEffect(() => {
    loadPosts(1);
  }, [loadPosts]);

  useEffect(() => {
    if (!currentUser || posts.length === 0) return;
    const newIds = posts.map(p => p.id).filter((id: number) => !fetchedInteractionIds.current.has(id));
    if (newIds.length === 0) return;
    const toFetch = newIds.slice(0, 50);
    toFetch.forEach((id: number) => fetchedInteractionIds.current.add(id));
    fetch(`/api/posts/batch-interactions?ids=${toFetch.join(",")}`)
      .then(r => r.json())
      .then(data => {
        if (data.interactions) setInteractions(prev => ({ ...prev, ...data.interactions }));
      })
      .catch(() => {});
  }, [posts, currentUser]);

  return (
    <AppLayout headerTitle={t("posts")}>
      <div className="px-2.5 sm:px-3">
        {loading && posts.length === 0 ? (
          <PostCardSkeleton count={5} />
        ) : posts.length > 0 ? (
          <>
            <div className="flex flex-col gap-[16px] mt-[10px]">
              {posts.filter((post: any) => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id, currentUser?.id)).map((post: any) => (
                <PostCard key={post.id} post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
              ))}
            </div>
            <LoadMoreTrigger
              onLoadMore={async () => {
                const user = await requireAuth();
                if (!user) return;
                loadPosts(page + 1);
              }}
              loading={loadingMore}
              hasMore={hasMore}
            />
          </>
        ) : (
          <EmptyState
            title={tExplore("noPostsYet")}
            description={tExplore("noPostsDesc")}
          />
        )}
      </div>
    </AppLayout>
  );
}
