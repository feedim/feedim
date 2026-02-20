"use client";

import { useState, useEffect, useCallback } from "react";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import PostListSection from "@/components/PostListSection";
import { FEED_PAGE_SIZE } from "@/lib/constants";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();

  const loadBookmarks = useCallback(async (pageNum: number) => {
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
      const { data: postsData } = await supabase
        .from("posts")
        .select(`
          id, title, slug, excerpt, featured_image, reading_time,
          like_count, comment_count, save_count, published_at, content_type, video_duration, video_thumbnail,
          profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan)
        `)
        .in("id", postIds)
        .eq("status", "published");

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

  return (
    <AppLayout headerTitle="Kaydedilenler" hideRightSidebar>
      <div className="px-2.5 sm:px-3">
        <PostListSection
          posts={posts}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={() => { const next = page + 1; setPage(next); loadBookmarks(next); }}
          emptyTitle="Henüz gönderi yok"
          emptyDescription="Beğendiğiniz gönderileri kaydedin, burada görüntülensin."
          emptyIcon={<Bookmark className="h-12 w-12" />}
          skeletonCount={4}
        />
      </div>
    </AppLayout>
  );
}
