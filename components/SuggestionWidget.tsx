"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bookmark } from "lucide-react";
import { emitNavigationStart } from "@/lib/navigationProgress";
import NoImage from "@/components/NoImage";
import { formatCount, formatRelativeDate } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import FollowButton from "@/components/FollowButton";
import UserListItem from "@/components/UserListItem";
import { feedimAlert } from "@/components/FeedimAlert";

interface SuggestedUser {
  user_id: string;
  name?: string;
  surname?: string;
  full_name?: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
  bio?: string;
}

interface TrendingPost {
  id: number;
  title: string;
  slug: string;
  view_count?: number;
  content_type?: string;
  published_at?: string;
  featured_image?: string;
  author: {
    username: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
}

interface TrendingTag {
  id: number;
  name: string;
  slug: string;
  post_count: number;
}

export default function SuggestionWidget() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadSuggestions();
    loadTrendingPosts();
    loadTrendingTags();
  }, []);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions?limit=3");
      if (!res.ok) { setLoaded(true); return; }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // Silent
    } finally {
      setLoaded(true);
    }
  }, []);

  const loadTrendingPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts/explore?page=1");
      const data = await res.json();
      setTrendingPosts((data.posts || []).slice(0, 3).map((p: any) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        view_count: p.view_count || 0,
        content_type: p.content_type,
        published_at: p.published_at || p.created_at,
        featured_image: p.featured_image,
        author: {
          username: p.profiles?.username || p.author?.username || "",
          full_name: p.profiles?.full_name || p.profiles?.name || p.author?.full_name || p.author?.name || "",
          avatar_url: p.profiles?.avatar_url || p.author?.avatar_url,
          is_verified: p.profiles?.is_verified || p.author?.is_verified || false,
          premium_plan: p.profiles?.premium_plan || p.author?.premium_plan || null,
          role: p.profiles?.role || p.author?.role || undefined,
        },
      })));
    } catch {
      // Silent
    }
  }, []);

  const loadTrendingTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags?q=");
      const data = await res.json();
      setTags((data.tags || []).filter((t: TrendingTag) => t.post_count > 0).slice(0, 6));
    } catch {
      // Silent
    }
  }, []);

  const doFollow = useCallback(async (username: string, userId: string) => {
    // Follow — optimistic update
    const newFollowing = new Set(following);
    newFollowing.add(userId);
    setFollowing(newFollowing);

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        const reverted = new Set(following);
        reverted.delete(userId);
        setFollowing(reverted);
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || "Günlük takip limitine ulaştın");
        }
      } else {
        const data = await res.json();
        const updated = new Set(following);
        const updatedReq = new Set(requested);
        if (data.following) updated.add(userId); else updated.delete(userId);
        if (data.requested) updatedReq.add(userId); else updatedReq.delete(userId);
        setFollowing(updated);
        setRequested(updatedReq);
      }
    } catch {
      const reverted = new Set(following);
      reverted.delete(userId);
      setFollowing(reverted);
    }
  }, [following, requested]);

  const doUnfollow = useCallback(async (username: string, userId: string) => {
    // Unfollow — wait for API before updating state (alert shows loader)
    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || "Günlük takip limitine ulaştın");
        }
        return;
      }
      const data = await res.json();
      const updated = new Set(following);
      const updatedReq = new Set(requested);
      if (data.following) updated.add(userId); else updated.delete(userId);
      if (data.requested) updatedReq.add(userId); else updatedReq.delete(userId);
      setFollowing(updated);
      setRequested(updatedReq);
    } catch {
      // Keep current state on error
    }
  }, [following, requested]);

  const handleFollow = useCallback((username: string, userId: string) => {
    if (following.has(userId) || requested.has(userId)) {
      feedimAlert("question", "Takibi bırakmak istiyor musunuz?", { showYesNo: true, onYes: () => doUnfollow(username, userId) });
      return;
    }
    doFollow(username, userId);
  }, [following, requested, doFollow, doUnfollow]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      emitNavigationStart();
      router.push(`/dashboard/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (!loaded) return null;

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <Search className="h-[18px] w-[18px]" />
        </div>
        <input
          data-hotkey="search"
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Ara"
          className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary rounded-[10px] text-[0.85rem] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-primary transition"
        />
      </form>

      {/* User Suggestions — top position */}
      {users.length > 0 && (
        <div className="rounded-[10px] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[0.95rem] font-bold">Kişileri Bul</span>
            <Link href="/dashboard/suggestions" className="text-[0.75rem] font-medium text-text-muted hover:text-text-primary transition">
              Tümünü gör
            </Link>
          </div>
          <div className="space-y-0">
            {users.map((u) => (
              <UserListItem
                key={u.user_id}
                user={u}
                autoSubtitle
                action={
                  <FollowButton following={following.has(u.user_id) || requested.has(u.user_id)} isPrivate={requested.has(u.user_id)} onClick={() => handleFollow(u.username, u.user_id)} />
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Trending Posts — "Öne Çıkanlar" */}
      {trendingPosts.length > 0 && (
        <div className="rounded-[10px] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[0.95rem] font-bold">Öne Çıkanlar</span>
            <Link href="/dashboard/explore" className="text-[0.75rem] font-medium text-text-muted hover:text-text-primary transition">
              Tümünü gör
            </Link>
          </div>
          <div className="space-y-0">
            {trendingPosts.map((post, i) => (
              <div key={post.id}>
                {i > 0 && <div className="mx-2 h-px bg-border-primary/40" />}
                <Link
                  href={`/post/${post.slug}`}
                  className="flex flex-col gap-2 px-3 py-3 my-[3px] rounded-lg hover:bg-bg-secondary transition"
                >
                  <div className="flex items-center gap-[2px]" style={{ columnGap: "2px" }}>
                    {post.author.avatar_url ? (
                      <img src={post.author.avatar_url} alt="" className="h-[26px] w-[26px] rounded-full object-cover" loading="lazy" />
                    ) : (
                      <img className="default-avatar-auto h-[26px] w-[26px] rounded-full object-cover" alt="" loading="lazy" />
                    )}
                    <div className="min-w-0 leading-none ml-[4px]">
                      <div className="flex items-center gap-1 leading-none">
                        <span className="text-[0.8rem] text-text-muted font-medium truncate">
                          {post.author.username}
                        </span>
                        {post.author.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(post.author.premium_plan)} role={post.author.role} />}
                      </div>
                      {post.published_at && (
                        <span className="text-[0.56rem] text-text-muted/70 leading-none relative -top-[2px]">
                          {formatRelativeDate(post.published_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.85rem] font-semibold leading-snug line-clamp-2">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[0.72rem] text-text-muted">
                        <span className="flex items-center gap-0.5">
                          {formatCount(post.view_count || 0)} görüntülenme
                        </span>
                        <span className="text-text-muted/60">
                          {post.content_type === "moment" ? "Moment" : post.content_type === "video" ? "Video" : "Gönderi"}
                        </span>
                      </div>
                    </div>
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt=""
                        className="w-[88px] h-[48px] rounded-md object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <NoImage className="w-[88px] h-[48px] rounded-md shrink-0" />
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Tags */}
      {tags.length > 0 && (
        <div className="rounded-[10px] p-2">
          <div className="px-2 py-2">
            <span className="text-[0.95rem] font-bold">Popüler Etiketler</span>
          </div>
          <div className="space-y-0">
            {tags.map(tag => (
              <Link
                key={tag.id}
                href={`/dashboard/explore/tag/${tag.slug}`}
                className="block px-4 py-2 rounded-[12px] hover:bg-bg-secondary transition"
              >
                <p className="text-[0.84rem] font-semibold">#{tag.name}</p>
                <p className="text-[0.68rem] text-text-muted">{formatCount(tag.post_count || 0)} gönderi</p>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
