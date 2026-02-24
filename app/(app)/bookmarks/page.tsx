"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect, useCallback } from "react";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { FEED_PAGE_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BookmarkTab = "all" | "posts" | "notes" | "moments" | "video";

export default function BookmarksPage() {
  useSearchParams();
  const [activeTab, setActiveTab] = useState<BookmarkTab>("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();

  const loadBookmarks = useCallback(async (pageNum: number, contentType: BookmarkTab = "all") => {
    setLoading(true);
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
        if (pageNum === 1) setPosts([]);
        setHasMore(false);
        return;
      }

      setHasMore(bookmarks.length >= FEED_PAGE_SIZE);

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
        postsQuery = postsQuery.eq("content_type", contentType === "posts" ? "article" : contentType);
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
      } else {
        setPosts(prev => [...prev, ...normalized]);
      }
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadBookmarks(1);
  }, []);

  const handleTabChange = (tab: BookmarkTab) => {
    setActiveTab(tab);
    setPosts([]);
    setPage(1);
    setHasMore(false);
    loadBookmarks(1, tab);
  };

  return (
    <AppLayout headerTitle="Kaydedilenler" hideRightSidebar>
      {/* Tab bar */}
      <div className="sticky top-[53px] z-20 bg-bg-primary sticky-ambient border-b border-border-primary">
        <div className="flex overflow-x-auto scrollbar-hide">
          {([
            { id: "all" as const, label: "Hepsi" },
            { id: "posts" as const, label: "Gönderiler" },
            { id: "notes" as const, label: "Notlar" },
            { id: "moments" as const, label: "Moments" },
            { id: "video" as const, label: "Video" },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "shrink-0 flex-1 py-3 text-[0.88rem] font-bold text-center border-b-[2.5px] transition whitespace-nowrap",
                activeTab === tab.id
                  ? "border-accent-main text-text-primary"
                  : "border-transparent text-text-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

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
              onLoadMore={() => { const next = page + 1; setPage(next); loadBookmarks(next, activeTab); }}
              loading={loading}
              hasMore={hasMore}
            />
          </>
        ) : (
          <EmptyState
            title="Henüz gönderi yok"
            description="Beğendiğiniz gönderileri kaydedin, burada görüntülensin."
            icon={<Bookmark className="h-12 w-12" />}
          />
        )}
      </div>
    </AppLayout>
  );
}
