"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { redirectToLogin } from "@/lib/loginNext";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import { isBlockedContent } from "@/lib/blockedWords";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import LazyAvatar from "@/components/LazyAvatar";
import FeedFilterSelect from "@/components/FeedFilterSelect";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";

type FeedMode = "for-you" | "following";

export default function PostsPage() {
  useSearchParams();
  const t = useTranslations("nav");
  const tExplore = useTranslations("explore");
  const tNotes = useTranslations("notes");
  const tFeed = useTranslations("feed");
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const { user: currentUser, isLoggedIn } = useUser();
  const { requireAuth } = useAuthModal();
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean; saved: boolean }>>({});
  const fetchedInteractionIds = useRef(new Set<number>());
  const cacheScope = currentUser?.id ? `user:${currentUser.id}:pi2` : "guest:pi2";

  const filterOptions = [
    { id: "for-you", label: tFeed("forYou") },
    { id: "following", label: tFeed("following") },
  ];

  const getPostsUrl = useCallback((pageNum: number, mode: FeedMode = feedMode) => {
    const baseUrl = mode === "following"
      ? `/api/posts/feed?tab=following&content_type=post&page=${pageNum}`
      : `/api/posts/feed?tab=posts&page=${pageNum}`;
    return withCacheScope(baseUrl, cacheScope);
  }, [cacheScope, feedMode]);

  useLayoutEffect(() => {
    const cached = readCache(getPostsUrl(1, feedMode)) as any;
    if (!cached?.posts) return;
    setPosts(cached.posts || []);
    setHasMore(cached.hasMore || false);
    setPage(1);
    setLoading(false);
  }, [feedMode, getPostsUrl]);

  const loadPosts = useCallback(async (pageNum: number, mode: FeedMode = feedMode) => {
    const url = getPostsUrl(pageNum, mode);
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
  }, [feedMode, getPostsUrl]);

  useEffect(() => {
    setPosts([]);
    setHasMore(false);
    setPage(1);
    fetchedInteractionIds.current.clear();
    setLoading(true);
    void loadPosts(1, feedMode);
  }, [feedMode, loadPosts]);

  const handleFeedModeChange = (nextValue: string) => {
    const nextMode = nextValue as FeedMode;
    if (nextMode === "following" && !isLoggedIn) {
      redirectToLogin();
      return;
    }
    setFeedMode(nextMode);
  };

  useEffect(() => {
    if (!currentUser || posts.length === 0) return;
    const newIds = posts
      .filter((post: any) => (
        typeof post.viewer_liked !== "boolean" ||
        typeof post.viewer_saved !== "boolean"
      ) && !fetchedInteractionIds.current.has(post.id))
      .map((post: any) => post.id);
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
    <AppLayout
      headerTitle={t("posts")}
      headerRightAction={
        <FeedFilterSelect
          value={feedMode}
          options={filterOptions}
          onChange={handleFeedModeChange}
          modalTitle={tExplore("filter")}
        />
      }
    >
      <div className="px-2.5 sm:px-3">
        <div className="mt-4 mb-3">
          <button
            onClick={() => {
              emitNavigationStart();
              router.push(isLoggedIn ? "/create" : "/login");
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none transition hover:opacity-80 bg-bg-secondary rounded-[18px]"
          >
            <LazyAvatar src={currentUser?.avatarUrl} sizeClass="h-9 w-9" className="shrink-0" />
            <span className="flex-1 text-left text-[0.95rem] text-text-muted">{tNotes("createPlaceholder")}</span>
          </button>
        </div>
        {loading && posts.length === 0 ? (
          <PostCardSkeleton count={5} />
        ) : posts.length > 0 ? (
          <>
            <div className="flex flex-col gap-[9px] mt-[10px]">
              {posts.filter((post: any) => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id, currentUser?.id)).map((post: any) => (
                <PostCard key={post.id} post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
              ))}
            </div>
            <LoadMoreTrigger
              onLoadMore={async () => {
                const user = await requireAuth();
                if (!user) return;
                loadPosts(page + 1, feedMode);
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
