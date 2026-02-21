"use client";

import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, PenLine, Search, Smile } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import FeedTabs from "@/components/FeedTabs";
import SuggestionCarousel from "@/components/SuggestionCarousel";
import MomentsCarousel from "@/components/MomentsCarousel";
import { PostGridSkeleton } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useUser } from "@/components/UserContext";
import { fetchWithCache } from "@/lib/fetchWithCache";
import { FeedAdSlot } from "@/components/AdBanner";
const PremiumWelcomeModal = lazy(() => import("@/components/modals/PremiumWelcomeModal"));

interface FeedPost {
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
  profiles?: {
    user_id: string;
    name?: string;
    surname?: string;
    full_name?: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [activeTab, setActiveTab] = useState("for-you");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followedTags, setFollowedTags] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [welcomeModal, setWelcomeModal] = useState<{ planName: string; planId: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const { user: ctxUser, isLoggedIn } = useUser();
  const [deletedPostIds, setDeletedPostIds] = useState<Set<number>>(new Set());

  // Check sessionStorage for optimistically deleted posts
  useEffect(() => {
    try {
      const deleted = JSON.parse(sessionStorage.getItem("fdm-deleted-posts") || "[]");
      if (deleted.length > 0) setDeletedPostIds(new Set(deleted));
    } catch {}
    // Listen for storage changes (e.g. deletion from another tab/component)
    const handleStorage = () => {
      try {
        const deleted = JSON.parse(sessionStorage.getItem("fdm-deleted-posts") || "[]");
        setDeletedPostIds(new Set(deleted));
      } catch {}
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const visiblePosts = posts.filter(p => !deletedPostIds.has(p.id));

  // Premium hoşgeldin modalı
  useEffect(() => {
    const raw = sessionStorage.getItem("fdm_welcome_premium");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setWelcomeModal({ planName: data.plan_name, planId: data.plan_id });
      } catch {}
      sessionStorage.removeItem("fdm_welcome_premium");
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      // Load followed tags for feed tabs
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase
          .from("tag_follows")
          .select("tag_id, tags(id, name, slug)")
          .eq("user_id", user.id)
          .limit(10)
          .then(({ data: tagFollows }) => {
            if (tagFollows) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const tags = tagFollows.map((tf: any) => tf.tags).filter(Boolean);
              setFollowedTags(tags);
            }
          });
      });
    }
    loadFeed("for-you", 1);
  }, []);

  const filterBlockedWords = useCallback((items: FeedPost[]) => {
    try {
      const raw = localStorage.getItem("fdm-blocked-words");
      if (!raw) return items;
      const words: string[] = JSON.parse(raw);
      if (!words.length) return items;
      return items.filter(post => {
        if (ctxUser?.id && post.profiles?.user_id === ctxUser.id) return true;
        const text = ((post.title || "") + " " + (post.excerpt || "")).toLowerCase();
        return !words.some(w => text.includes(w));
      });
    } catch { return items; }
  }, [ctxUser?.id]);

  const loadFeed = useCallback(async (tab: string, pageNum: number) => {
    if (pageNum === 1) setLoading(true);

    try {
      let endpoint = "/api/posts/explore?page=" + pageNum;

      if (tab === "for-you") {
        endpoint = "/api/posts/explore?page=" + pageNum;
      } else if (tab === "followed") {
        endpoint = "/api/posts/feed?page=" + pageNum;
      } else if (tab === "bookmarks") {
        // Load bookmarks via Supabase client
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const from = (pageNum - 1) * 12;
          const { data: bookmarks } = await supabase
            .from("bookmarks")
            .select("post_id")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(from, from + 12);

          if (bookmarks && bookmarks.length > 0) {
            const { data: bookmarkedPosts } = await supabase
              .from("posts")
              .select(`
                id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, published_at,
                profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan)
              `)
              .in("id", bookmarks.map(b => b.post_id))
              .eq("status", "published");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped = (bookmarkedPosts || []).map((p: any) => ({
              ...p,
              profiles: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles,
            }));
            const filtered = filterBlockedWords(mapped);
            setPosts(pageNum === 1 ? filtered : prev => [...prev, ...filtered]);
            setHasMore((bookmarks?.length || 0) > 12);
          } else {
            if (pageNum === 1) setPosts([]);
            setHasMore(false);
          }
          setPage(pageNum);
          setLoading(false);
          return;
        }
      }

      // Handle tag tabs
      if (tab.startsWith("tag-")) {
        const tagSlug = tab.replace("tag-", "");
        endpoint = `/api/posts/explore?page=${pageNum}&tag=${encodeURIComponent(tagSlug)}`;
      }

      if (tab !== "bookmarks") {
        const data = await fetchWithCache(endpoint, { ttlSeconds: 30, forceRefresh: pageNum > 1 }) as any;
        const filtered = filterBlockedWords(data.posts || []);
        if (pageNum === 1) {
          setPosts(filtered);
        } else {
          setPosts(prev => [...prev, ...filtered]);
        }
        setHasMore(data.hasMore || false);
        setPage(pageNum);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [supabase, filterBlockedWords]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setPosts([]);
    setPage(1);
    loadFeed(tab, 1);
  }, [loadFeed]);

  const loadMore = async () => {
    setLoadingMore(true);
    await loadFeed(activeTab, page + 1);
    setLoadingMore(false);
  };

  return (
    <AppLayout scrollableHeader>
      {/* Feed Tabs */}
      <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} followedTags={followedTags} isLoggedIn={isLoggedIn} />

      {/* Create Post Box — Substack inline composer */}
      <div className="px-2.5 sm:px-3 mt-4 mb-3">
      <button
        onClick={() => router.push(isLoggedIn ? "/dashboard/write" : "/login")}
        className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none transition hover:opacity-80 bg-bg-secondary rounded-[18px]"
      >
        {ctxUser?.avatarUrl ? (
          <img src={ctxUser.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-accent-main/10 text-accent-main flex items-center justify-center shrink-0">
            <PenLine className="h-4 w-4" />
          </div>
        )}
        <span className="flex-1 text-left text-[0.95rem] text-text-muted">Aklınızda ne var?</span>
        <div className="flex items-center gap-[2px] shrink-0">
          <span className="flex items-center justify-center h-[32px] w-[32px] rounded-full text-[0.7rem] font-bold text-text-muted">GIF</span>
          <span className="flex items-center justify-center h-[32px] w-[32px] rounded-full text-text-muted">
            <Smile className="h-[18px] w-[18px]" />
          </span>
        </div>
      </button>
      </div>

      {/* Content */}
      {loading ? (
        <PostGridSkeleton count={4} />
      ) : visiblePosts.length > 0 ? (
        <>
          <div className="divide-y-0">
            {visiblePosts.map((post, index) => (
              <div key={post.id}>
                <PostCard post={post} />
                {index === 2 && <MomentsCarousel />}
                {index === 4 && isLoggedIn && <SuggestionCarousel />}
                <FeedAdSlot index={index} />
              </div>
            ))}
          </div>
          <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
        </>
      ) : (
        <EmptyState
          icon={activeTab === "bookmarks" ? <Bookmark className="h-12 w-12" /> : <Search className="h-12 w-12" />}
          title={
            activeTab === "for-you" ? "Henüz gönderi yok" :
            activeTab === "followed" ? "Henüz gönderi yok" :
            activeTab.startsWith("tag-") ? "Bu etikette gönderi bulunamadı" :
            "Kaydedilen gönderi yok"
          }
          description={
            activeTab === "for-you" ? "İlk gönderinizi yazarak başlayın veya keşfet sayfasına göz atın." :
            activeTab === "followed" ? "Kullanıcıları takip etmeye başladığınızda gönderileri burada görünecek." :
            activeTab.startsWith("tag-") ? "Bu etiketle ilgili içerikler yayınlandığında burada görünecek." :
            "Beğendiğiniz gönderileri kaydedin, buradan kolayca ulaşın."
          }
          action={
            activeTab === "for-you"
              ? { label: "Keşfet", href: "/dashboard/explore" }
              : activeTab === "followed"
              ? { label: "Keşfet", href: "/dashboard/explore" }
              : undefined
          }
        />
      )}
      {welcomeModal && (
        <Suspense fallback={null}>
          <PremiumWelcomeModal
            open
            onClose={() => setWelcomeModal(null)}
            planName={welcomeModal.planName}
            planId={welcomeModal.planId}
            avatarUrl={ctxUser?.avatarUrl}
            fullName={ctxUser?.fullName}
          />
        </Suspense>
      )}
    </AppLayout>
  );
}
