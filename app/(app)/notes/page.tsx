"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { PenLine } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useUser } from "@/components/UserContext";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";
import { useAuthModal } from "@/components/AuthModal";
import { isBlockedContent } from "@/lib/blockedWords";

interface NotePost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  reading_time?: number;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  save_count?: number;
  published_at?: string;
  content_type?: string;
  video_duration?: number;
  video_thumbnail?: string;
  video_url?: string;
  blurhash?: string | null;
  is_nsfw?: boolean;
  moderation_category?: string | null;
  profiles?: {
    user_id: string;
    name?: string;
    surname?: string;
    full_name?: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
}

export default function CommunityNotesPage() {
  const t = useTranslations("notes");
  const [posts, setPosts] = useState<NotePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean; saved: boolean }>>({});
  const fetchedInteractionIds = useRef(new Set<number>());
  const router = useRouter();
  const { user: ctxUser, isLoggedIn } = useUser();
  const { requireAuth } = useAuthModal();
  const cacheScope = ctxUser?.id ? `user:${ctxUser.id}` : "guest";

  const getNotesUrl = useCallback((pageNum: number) => (
    withCacheScope(`/api/posts/feed?tab=notes&page=${pageNum}`, cacheScope)
  ), [cacheScope]);

  useLayoutEffect(() => {
    const cached = readCache(getNotesUrl(1)) as any;
    if (!cached?.posts) return;
    setPosts(cached.posts || []);
    setHasMore(cached.hasMore || false);
    setPage(1);
    setLoading(false);
  }, [getNotesUrl]);

  const loadNotes = useCallback(async (pageNum: number) => {
    const url = getNotesUrl(pageNum);
    if (pageNum === 1) {
    }
    try {
      const data = await fetchWithCache(url, { ttlSeconds: 30, forceRefresh: pageNum > 1 }) as any;
      const items = data.posts || [];
      if (pageNum === 1) {
        setPosts(items);
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...items.filter((p: NotePost) => !existingIds.has(p.id))];
        });
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [getNotesUrl]);

  useEffect(() => {
    loadNotes(1);
  }, [loadNotes]);

  // Batch-fetch liked/saved status
  useEffect(() => {
    if (!isLoggedIn || posts.length === 0) return;
    const newIds = posts.map(p => p.id).filter(id => !fetchedInteractionIds.current.has(id));
    if (newIds.length === 0) return;
    const toFetch = newIds.slice(0, 50);
    toFetch.forEach(id => fetchedInteractionIds.current.add(id));
    fetch(`/api/posts/batch-interactions?ids=${toFetch.join(",")}`)
      .then(r => r.json())
      .then(data => {
        if (data.interactions) {
          setInteractions(prev => ({ ...prev, ...data.interactions }));
        }
      })
      .catch(() => {});
  }, [posts, isLoggedIn]);

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setLoadingMore(true);
    await loadNotes(page + 1);
    setLoadingMore(false);
  };

  return (
    <AppLayout headerTitle={t("pageTitle")}>
      {/* Create Note Box */}
      <div className="px-2.5 sm:px-3 mt-4 mb-3">
        <button
          onClick={() => { emitNavigationStart(); router.push(isLoggedIn ? "/create/note" : "/login"); }}
          className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none transition hover:opacity-80 bg-bg-secondary rounded-[18px]"
        >
          {ctxUser?.avatarUrl ? (
            <img suppressHydrationWarning data-src={ctxUser.avatarUrl} alt="" className="lazyload h-9 w-9 rounded-full object-cover shrink-0 bg-bg-tertiary border border-border-primary" decoding="async" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-accent-main/10 text-accent-main flex items-center justify-center shrink-0">
              <PenLine className="h-4 w-4" />
            </div>
          )}
          <span className="flex-1 text-left text-[0.95rem] text-text-muted">{t("createPlaceholder")}</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <PostCardSkeleton count={5} variant="note" />
      ) : posts.length > 0 ? (
        <>
          <div className="flex flex-col gap-[16px] mt-[10px]">
            {posts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id, ctxUser?.id)).map((post) => (
              <div key={post.id}>
                <PostCard
                  post={post}
                  initialLiked={interactions[post.id]?.liked}
                  initialSaved={interactions[post.id]?.saved}
                />
              </div>
            ))}
          </div>
          <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
        </>
      ) : (
        <EmptyState
          title={t("emptyForYouTitle")}
          description={t("emptyForYouDesc")}
        />
      )}
    </AppLayout>
  );
}
