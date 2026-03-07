"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Check, LayoutGrid, BookOpen, PenLine, Clapperboard, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import Modal from "@/components/modals/Modal";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { readCache, withCacheScope, writeCache } from "@/lib/fetchWithCache";

type BookmarkFilter = "all" | "post" | "note" | "moment" | "video";

export default function BookmarksPage() {
  useSearchParams();
  const t = useTranslations();
  const [filter, setFilter] = useState<BookmarkFilter>("all");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  const getBookmarksCacheUrl = useCallback((pageNum: number, contentType: BookmarkFilter = "all") => (
    withCacheScope(`/internal/bookmarks?page=${pageNum}&type=${contentType}`, currentUser?.id ? `user:${currentUser.id}` : null)
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

      const { data: postsData } = await postsQuery;

      // Preserve bookmark order
      const postMap = new Map((postsData || []).map(p => [p.id, p]));
      const ordered = postIds.map(id => postMap.get(id)).filter(Boolean);

      // Normalize profiles
      const normalized = ordered.map((p: any) => ({
        ...p,
        profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
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
    setFilterModalOpen(false);
    setPosts([]);
    setPage(1);
    setHasMore(false);
    loadBookmarks(1, f);
  };

  const currentFilterLabel = filterOptions.find(o => o.id === filter)?.label || t("bookmarks.all");

  const filterButton = (
    <button
      onClick={() => setFilterModalOpen(true)}
      className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-bg-secondary hover:bg-bg-elevated transition"
    >
      {currentFilterLabel}
      <ChevronDown className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <AppLayout headerTitle={t("bookmarks.title")} hideRightSidebar headerRightAction={filterButton}>
      <div className="px-2.5 sm:px-3">
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

      <Modal open={filterModalOpen} onClose={() => setFilterModalOpen(false)} title={t("bookmarks.filterTitle")} size="sm">
        <div className="p-2 space-y-1">
          {filterOptions.map(opt => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleFilterChange(opt.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] text-[0.88rem] font-medium transition hover:bg-bg-tertiary ${
                  filter === opt.id ? "text-accent-main" : "text-text-primary"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-[18px] w-[18px]" />
                  {opt.label}
                </span>
                {filter === opt.id && <Check className="h-4.5 w-4.5 text-accent-main" />}
              </button>
            );
          })}
        </div>
      </Modal>
    </AppLayout>
  );
}
