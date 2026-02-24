"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { PenLine, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import { PostGridSkeleton } from "@/components/Skeletons";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useUser } from "@/components/UserContext";
import { fetchWithCache } from "@/lib/fetchWithCache";
import { useAuthModal } from "@/components/AuthModal";

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
  const [activeTab, setActiveTab] = useState<"for-you" | "following" | "popular">("for-you");
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

  const loadNotes = useCallback(async (tab: string, pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    try {
      const endpoint = tab === "following"
        ? `/api/posts/feed?content_type=note&page=${pageNum}`
        : tab === "popular"
        ? `/api/posts/explore?content_type=note&sort=trending&page=${pageNum}`
        : `/api/posts/explore?content_type=note&page=${pageNum}`;
      const data = await fetchWithCache(endpoint, { ttlSeconds: 30, forceRefresh: true }) as any;
      const items = data.posts || [];
      if (pageNum === 1) {
        setPosts(items);
      } else {
        setPosts(prev => [...prev, ...items]);
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
    loadNotes("for-you", 1);
  }, []);

  // Batch-fetch liked/saved status
  useEffect(() => {
    if (!isLoggedIn || posts.length === 0) return;
    const newIds = posts.map(p => p.id).filter(id => !fetchedInteractionIds.current.has(id));
    if (newIds.length === 0) return;
    newIds.forEach(id => fetchedInteractionIds.current.add(id));
    fetch(`/api/posts/batch-interactions?ids=${newIds.join(",")}`)
      .then(r => r.json())
      .then(data => {
        if (data.interactions) {
          setInteractions(prev => ({ ...prev, ...data.interactions }));
        }
      })
      .catch(() => {});
  }, [posts, isLoggedIn]);

  const handleTabChange = useCallback((tab: "for-you" | "following" | "popular") => {
    setActiveTab(tab);
    setPosts([]);
    setPage(1);
    setInteractions({});
    fetchedInteractionIds.current.clear();
    loadNotes(tab, 1);
  }, [loadNotes]);

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setLoadingMore(true);
    await loadNotes(activeTab, page + 1);
    setLoadingMore(false);
  };

  return (
    <AppLayout headerTitle="Topluluk Notları">
      {/* Tabs */}
      <div className="flex border-b border-border-primary sticky top-[53px] z-20">
        <button
          onClick={() => handleTabChange("for-you")}
          className={`flex-1 py-3.5 text-[0.88rem] font-semibold transition relative ${
            activeTab === "for-you" ? "text-text-primary" : "text-text-muted"
          }`}
        >
          Senin İçin
          {activeTab === "for-you" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-accent-main rounded-full" />}
        </button>
        <button
          onClick={() => handleTabChange("popular")}
          className={`flex-1 py-3.5 text-[0.88rem] font-semibold transition relative ${
            activeTab === "popular" ? "text-text-primary" : "text-text-muted"
          }`}
        >
          Popüler
          {activeTab === "popular" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-accent-main rounded-full" />}
        </button>
        <button
          onClick={() => handleTabChange("following")}
          className={`flex-1 py-3.5 text-[0.88rem] font-semibold transition relative ${
            activeTab === "following" ? "text-text-primary" : "text-text-muted"
          }`}
        >
          Takip
          {activeTab === "following" && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-accent-main rounded-full" />}
        </button>
      </div>

      {/* Create Note Box */}
      <div className="px-2.5 sm:px-3 mt-4 mb-3">
        <button
          onClick={() => { emitNavigationStart(); router.push(isLoggedIn ? "/create/note" : "/login"); }}
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
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-2"><PostGridSkeleton count={4} /></div>
      ) : posts.length > 0 ? (
        <>
          <div className="flex flex-col gap-[40px]">
            {posts.map((post) => (
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
          icon={<Users className="h-12 w-12" />}
          title={activeTab === "following" ? "Henüz not yok" : "Henüz topluluk notu yok"}
          description={
            activeTab === "following"
              ? "Takip ettiğiniz kullanıcılar not paylaştığında burada görünecek."
              : "Topluluk notları burada gösterilecek. İlk notu siz paylaşın!"
          }
          action={{ label: "Not Oluştur", href: "/create/note" }}
        />
      )}
    </AppLayout>
  );
}
