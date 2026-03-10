"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, BookOpen, PenLine, Clapperboard, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import FeedFilterSelect from "@/components/FeedFilterSelect";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { readCache, withCacheScope, writeCache } from "@/lib/fetchWithCache";

type BookmarkFilter = "all" | "post" | "note" | "moment" | "video";

export default function BookmarksPage() {
  useSearchParams();
  const t = useTranslations();
  const [filter, setFilter] = useState<BookmarkFilter>("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  const getBookmarksCacheUrl = useCallback((pageNum: number, contentType: BookmarkFilter = "all") => (
    withCacheScope(`/internal/bookmarks?page=${pageNum}&type=${contentType}`, currentUser?.id ? `user:${currentUser.id}:pi2` : null)
  ), [currentUser?.id]);

  const filterOptions: { id: BookmarkFilter; label: string; icon: typeof LayoutGrid }[] = [
    { id: "all", label: t("bookmarks.all"), icon: LayoutGrid },
    { id: "post", label: t("bookmarks.posts"), icon: BookOpen },
    { id: "note", label: t("bookmarks.notes"), icon: PenLine },
    { id: "moment", label: t("bookmarks.moments"), icon: Clapperboard },
    { id: "video", label: t("bookmarks.video"), icon: Film },
  ];

  useLayoutEffect(() => {
    if (!currentUser?.id) return;
    const cached = readCache(getBookmarksCacheUrl(1, filter)) as { posts?: any[]; hasMore?: boolean } | null;
    if (cached?.posts) {
      setPosts(cached.posts);
      setHasMore(cached.hasMore || false);
      setLoading(false);
    }
  }, [currentUser?.id, filter, getBookmarksCacheUrl]);

  const loadBookmarks = useCallback(async (pageNum: number, contentType: BookmarkFilter = "all") => {
    const cacheUrl = getBookmarksCacheUrl(pageNum, contentType);
    if (pageNum === 1) {
    } else {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = (pageNum - 1) * FEED_PAGE_SIZE;
      const to = from + FEED_PAGE_SIZE - 1;

      const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!bookmarks || bookmarks.length === 0) {
        if (pageNum === 1) {
          setPosts([]);
          writeCache(cacheUrl, { posts: [], hasMore: false }, 30);
        }
        setHasMore(false);
        return;
      }

      const nextHasMore = bookmarks.length >= FEED_PAGE_SIZE;
      setHasMore(nextHasMore);

      const postIds = bookmarks.map(b => b.post_id);
      let postsQuery = supabase
        .from("posts")
        .select(`
          id, title, slug, excerpt, featured_image, reading_time,
          like_count, comment_count, save_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash,
          profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan)
        `)
        .in("id", postIds)
        .eq("status", "published");

      if (contentType !== "all") {
        postsQuery = postsQuery.eq("content_type", contentType);
      }

      const [{ data: postsData }, { data: likesData }] = await Promise.all([
        postsQuery,
        supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds),
      ]);

      // Preserve bookmark order
      const postMap = new Map((postsData || []).map(p => [p.id, p]));
      const likedIds = new Set((likesData || []).map((like) => like.post_id));
      const ordered = postIds.map(id => postMap.get(id)).filter(Boolean);

      // Normalize profiles
      const normalized = ordered.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
        viewer_liked: likedIds.has(p.id),
        viewer_saved: true,
      }));

      if (pageNum === 1) {
        setPosts(normalized);
        writeCache(cacheUrl, { posts: normalized, hasMore: nextHasMore }, 30);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const merged = [...prev, ...normalized.filter((p: any) => !existingIds.has(p.id))];
          writeCache(cacheUrl, { posts: merged, hasMore: nextHasMore }, 30);
          return merged;
        });
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [getBookmarksCacheUrl, supabase]);

  useEffect(() => {
    void loadBookmarks(1);
  }, [loadBookmarks]);

  const handleFilterChange = (f: BookmarkFilter) => {
    setFilter(f);
    setPosts([]);
    setPage(1);
    setHasMore(false);
    setLoading(true);
    loadBookmarks(1, f);
  };

  return (
    <AppLayout
      headerTitle={t("bookmarks.title")}
      hideRightSidebar
      headerRightAction={
        <FeedFilterSelect
          value={filter}
          options={filterOptions}
          onChange={(next) => handleFilterChange(next as BookmarkFilter)}
          modalTitle={t("bookmarks.filterTitle")}
        />
      }
    >
      <div className="sm:px-3">
        {loading && posts.length === 0 ? (
          <PostCardSkeleton count={5} />
        ) : posts.length > 0 ? (
          <>
            <div className="flex flex-col gap-[16px] mt-[10px]">
            {posts.map((post: any) => (
              <PostCard key={post.id} post={post} initialSaved={true} />
            ))}
            </div>
            <LoadMoreTrigger
              onLoadMore={async () => {
                const user = await requireAuth();
                if (!user) return;
                const next = page + 1;
                setPage(next);
                loadBookmarks(next, filter);
              }}
              loading={loading}
              hasMore={hasMore}
            />
          </>
        ) : (
          <EmptyState
            title={t("bookmarks.emptyTitle")}
            description={t("bookmarks.emptyDesc")}
          />
        )}
      </div>
    </AppLayout>
  );
}
