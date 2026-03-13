"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { emitNavigationStart } from "@/lib/navigationProgress";
import BlurImage from "@/components/BlurImage";
import LazyAvatar from "@/components/LazyAvatar";
import NoImage from "@/components/NoImage";
import { useTranslations, useLocale } from "next-intl";
import { formatCount, formatRelativeDate, getPostUrl } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import FollowButton from "@/components/FollowButton";
import UserListItem from "@/components/UserListItem";
import { feedimAlert } from "@/components/FeedimAlert";
import { isBlockedContent } from "@/lib/blockedWords";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";

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
  follows_me?: boolean;
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

export default function SuggestionWidget() {
  const t = useTranslations("follow");
  const tPost = useTranslations("post");
  const locale = useLocale();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const viewerScope = currentUser?.id ? `user:${currentUser.id}` : "guest";
  const suggestionsUrl = withCacheScope("/api/suggestions?limit=3", viewerScope);
  const trendingUrl = withCacheScope(`/api/posts/explore?page=1&locale=${locale}`, viewerScope);

  useLayoutEffect(() => {
    const cachedSuggestions = readCache(suggestionsUrl) as { users?: SuggestedUser[] } | null;
    const cachedTrending = readCache(trendingUrl) as {
      posts?: Array<{
        id: number;
        title: string;
        slug: string;
        view_count?: number;
        content_type?: string;
        published_at?: string;
        created_at?: string;
        featured_image?: string;
        profiles?: TrendingPost["author"];
        author?: TrendingPost["author"];
      }>;
    } | null;

    if (cachedSuggestions?.users) {
      setUsers(cachedSuggestions.users);
      setLoaded(true);
    }
    if (Array.isArray(cachedTrending?.posts)) {
      const posts = cachedTrending.posts;
      setTrendingPosts(posts.filter((p) => p.content_type !== "note").slice(0, 3).map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        view_count: p.view_count || 0,
        content_type: p.content_type,
        published_at: p.published_at || p.created_at,
        featured_image: p.featured_image,
        author: {
          username: p.profiles?.username || p.author?.username || "",
          full_name: p.profiles?.full_name || p.author?.full_name || "",
          avatar_url: p.profiles?.avatar_url || p.author?.avatar_url,
          is_verified: p.profiles?.is_verified || p.author?.is_verified || false,
          premium_plan: p.profiles?.premium_plan || p.author?.premium_plan || null,
          role: p.profiles?.role || p.author?.role || undefined,
        },
      })));
    }
  }, [suggestionsUrl, trendingUrl]);

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await fetchWithCache(suggestionsUrl, { ttlSeconds: 300 }) as { users?: SuggestedUser[] };
      setUsers(data.users || []);
    } catch {
      // Silent
    } finally {
      setLoaded(true);
    }
  }, [suggestionsUrl]);

  const loadTrendingPosts = useCallback(async () => {
    try {
      const data = await fetchWithCache(trendingUrl, { ttlSeconds: 30 }) as {
        posts?: Array<{
          id: number;
          title: string;
          slug: string;
          view_count?: number;
          content_type?: string;
          published_at?: string;
          created_at?: string;
          featured_image?: string;
          profiles?: {
            username?: string;
            full_name?: string;
            name?: string;
            avatar_url?: string;
            is_verified?: boolean;
            premium_plan?: string | null;
            role?: string;
          };
          author?: {
            username?: string;
            full_name?: string;
            name?: string;
            avatar_url?: string;
            is_verified?: boolean;
            premium_plan?: string | null;
            role?: string;
          };
        }>;
      };
      const posts = Array.isArray(data.posts) ? data.posts as Array<{
        id: number;
        title: string;
        slug: string;
        view_count?: number;
        content_type?: string;
        published_at?: string;
        created_at?: string;
        featured_image?: string;
        profiles?: {
          username?: string;
          full_name?: string;
          name?: string;
          avatar_url?: string;
          is_verified?: boolean;
          premium_plan?: string | null;
          role?: string;
        };
        author?: {
          username?: string;
          full_name?: string;
          name?: string;
          avatar_url?: string;
          is_verified?: boolean;
          premium_plan?: string | null;
          role?: string;
        };
      }> : [];
      setTrendingPosts(posts.filter((p) => p.content_type !== "note").slice(0, 3).map((p) => ({
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
  }, [trendingUrl]);

  useEffect(() => {
    void loadSuggestions();
    void loadTrendingPosts();
  }, [loadSuggestions, loadTrendingPosts]);

  const doFollow = useCallback(async (username: string, userId: string) => {
    if (pending.has(userId)) return;
    const prevFollowing = new Set(following);
    const prevRequested = new Set(requested);
    setPending(prev => new Set(prev).add(userId));
    setFollowing(prev => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    setRequested(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(prev => {
        const next = new Set(prev);
        if (data.following) next.add(userId); else next.delete(userId);
        return next;
      });
      setRequested(prev => {
        const next = new Set(prev);
        if (data.requested) next.add(userId); else next.delete(userId);
        return next;
      });
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [following, requested, pending, t]);

  const doUnfollow = useCallback(async (username: string, userId: string) => {
    if (pending.has(userId)) return;
    // Unfollow — optimistic update for instant feedback
    const prevFollowing = new Set(following);
    const prevRequested = new Set(requested);
    setPending(prev => new Set(prev).add(userId));
    setFollowing(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setRequested(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 403 || res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
      } else {
        const data = await res.json();
        setFollowing(prev => {
          const next = new Set(prev);
          if (data.following) next.add(userId); else next.delete(userId);
          return next;
        });
        setRequested(prev => {
          const next = new Set(prev);
          if (data.requested) next.add(userId); else next.delete(userId);
          return next;
        });
      }
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [following, requested, pending]);

  const handleFollow = useCallback(async (username: string, userId: string) => {
    const user = await requireAuth();
    if (!user) return;

    if (following.has(userId) || requested.has(userId)) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => { void doUnfollow(username, userId); } });
      return;
    }
    void doFollow(username, userId);
  }, [following, requested, doFollow, doUnfollow, requireAuth]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      emitNavigationStart();
      router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const bone = "h-[9px] bg-bg-secondary rounded-[5px] animate-pulse";

  if (!loaded) return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
          <Search className="h-[18px] w-[18px]" />
        </div>
        <input
          type="search"
          disabled
          placeholder={t("search")}
          className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary rounded-[10px] text-[0.85rem] text-text-primary placeholder:text-text-muted focus:outline-none transition"
        />
      </div>

      {/* User suggestions skeleton */}
      <div className="rounded-[10px] p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-[0.95rem] font-bold">{t("findPeople")}</span>
          <span className="text-[0.75rem] font-medium text-text-muted">{t("seeAll")}</span>
        </div>
        <div className="space-y-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-2 py-2.5">
              <div className="h-[40px] w-[40px] rounded-full bg-bg-secondary shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0 space-y-[6px]">
                <div className={`${bone} w-24`} />
                <div className={`${bone} w-16`} />
              </div>
              <div className="h-[30px] w-[72px] bg-bg-secondary rounded-lg shrink-0 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Trending posts skeleton */}
      <div className="rounded-[10px] p-2">
        <div className="flex items-center justify-between px-2 py-2">
          <span className="text-[0.95rem] font-bold">{t("trending")}</span>
          <span className="text-[0.75rem] font-medium text-text-muted">{t("seeAll")}</span>
        </div>
        <div className="space-y-0">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-3 py-3">
              {i > 1 && <div className="mx-2 h-px bg-border-primary/40 mb-3" />}
              <div className="flex items-center gap-[6px] mb-2">
                <div className="h-[26px] w-[26px] rounded-full bg-bg-secondary shrink-0 animate-pulse" />
                <div className={`${bone} w-20`} />
              </div>
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 space-y-[6px]">
                  <div className={`${bone} w-full`} />
                  <div className={`${bone} w-3/4`} />
                  <div className={`${bone} w-14 mt-1`} />
                </div>
                <div className="w-[88px] h-[48px] rounded-md bg-bg-secondary shrink-0 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

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
          placeholder={t("search")}
          className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary rounded-[10px] text-[0.85rem] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-border-primary transition"
        />
      </form>

      {/* User Suggestions — top position */}
      {users.length > 0 && (
        <div className="rounded-[10px] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[0.95rem] font-bold">{t("findPeople")}</span>
            <Link href="/suggestions" className="text-[0.75rem] font-medium text-text-muted hover:text-text-primary transition hover:underline">
              {t("seeAll")}
            </Link>
          </div>
          <div className="space-y-0">
            {users.map((u) => (
              <UserListItem
                key={u.user_id}
                user={u}
                autoSubtitle
                action={
                  <FollowButton following={following.has(u.user_id) || requested.has(u.user_id)} isPrivate={requested.has(u.user_id)} followsMe={u.follows_me && !following.has(u.user_id)} onClick={() => { void handleFollow(u.username, u.user_id); }} disabled={pending.has(u.user_id)} />
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
            <span className="text-[0.95rem] font-bold">{t("trending")}</span>
            <Link href="/explore" className="text-[0.75rem] font-medium text-text-muted hover:text-text-primary transition hover:underline">
              {t("seeAll")}
            </Link>
          </div>
          <div className="space-y-0">
            {trendingPosts.filter(post => !isBlockedContent(post.title || "")).map((post, i) => (
              <div key={post.id}>
                {i > 0 && <div className="mx-2 h-px bg-border-primary/40" />}
                <div className="flex flex-col gap-2 px-3 py-3 my-[3px] rounded-lg hover:bg-bg-secondary transition">
                  <div className="flex items-center gap-[2px]" style={{ columnGap: "2px" }}>
                    <Link href={`/u/${post.author.username}`}>
                      <LazyAvatar src={post.author.avatar_url} alt={post.author.username} sizeClass="h-[26px] w-[26px]" />
                    </Link>
                    <div className="min-w-0 leading-none ml-[4px]">
                      <div className="flex items-center gap-1 leading-none">
                        <Link href={`/u/${post.author.username}`} className="text-[0.8rem] text-text-primary font-medium truncate hover:text-text-primary transition">
                          @{post.author.username}
                        </Link>
                        {(post.author.is_verified || post.author.role === "admin") && <VerifiedBadge size="sm" variant={getBadgeVariant(post.author.premium_plan)} role={post.author.role} />}
                        {post.published_at && (
                          <span className="text-[0.56rem] text-text-muted/50 leading-none shrink-0">· {formatRelativeDate(post.published_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link href={getPostUrl(post.slug, post.content_type)} className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.85rem] font-semibold leading-snug line-clamp-2">
                        {post.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-[0.72rem] text-text-muted">
                        <span className="flex items-center gap-0.5">
                          {formatCount(post.view_count || 0)} {t("views")}
                        </span>
                        <span className="text-text-muted/60">
                          {post.content_type === "moment" ? tPost("moment") : post.content_type === "video" ? tPost("video") : tPost("post")}
                        </span>
                      </div>
                    </div>
                    {post.featured_image ? (
                      <BlurImage
                        src={post.featured_image}
                        alt=""
                        className="w-[88px] h-[48px] rounded-md shrink-0"
                      />
                    ) : (
                      <NoImage className="w-[88px] h-[48px] rounded-md shrink-0" />
                    )}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
