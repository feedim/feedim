"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Search, X, Hash, ChevronRight } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import MomentGridCard from "@/components/MomentGridCard";
import { PostGridSkeleton, UserListSkeleton } from "@/components/Skeletons";
import { cn } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import FollowButton from "@/components/FollowButton";

interface TagPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  reading_time?: number;
  like_count?: number;
  comment_count?: number;
  published_at?: string;
  profiles?: {
    user_id: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
  };
}

interface TagUser {
  user_id: string;
  name?: string;
  surname?: string;
  full_name?: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  bio?: string;
}

type TagTab = "popular" | "latest" | "posts" | "users";

export default function TagPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [tagInfo, setTagInfo] = useState<{ id: number; name: string; slug: string; post_count: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TagTab>("popular");
  const [posts, setPosts] = useState<TagPost[]>([]);
  const [users, setUsers] = useState<TagUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isFollowing, setIsFollowing] = useState(false);

  // Moments for grid section
  const [tagMoments, setTagMoments] = useState<{ id: number; title: string; slug: string; video_thumbnail?: string; featured_image?: string; video_duration?: number; view_count?: number }[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TagPost[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuthModal();

  const tabs: { key: TagTab; label: string }[] = [
    { key: "popular", label: "Popüler" },
    { key: "latest", label: "En Son" },
    { key: "posts", label: "Gönderiler" },
    { key: "users", label: "Kişiler" },
  ];

  // Load tag info
  useEffect(() => {
    if (!slug) return;
    const init = async () => {
      setLoading(true);
      try {
        // Get tag info
        const tagRes = await fetch(`/api/tags?q=${encodeURIComponent(slug)}`);
        const tagData = await tagRes.json();
        const found = (tagData.tags || []).find((t: { slug: string }) => t.slug === slug);
        if (found) {
          setTagInfo(found);
          // Check follow status
          const followRes = await fetch("/api/tags?followed=true");
          const followData = await followRes.json();
          if (followData.followedTagIds?.includes(found.id)) {
            setIsFollowing(true);
          }
        }
        // Load initial posts + moments
        await loadPosts(1, "trending");
        // Load moments for this tag
        try {
          const mRes = await fetch(`/api/posts/explore?tag=${encodeURIComponent(slug)}&content_type=moment&page=1`);
          if (mRes.ok) {
            const mData = await mRes.json();
            setTagMoments((mData.posts || []).slice(0, 6));
          }
        } catch {}
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [slug]);

  const loadPosts = useCallback(async (pageNum: number, sort: string) => {
    try {
      const res = await fetch(`/api/posts/explore?tag=${encodeURIComponent(slug)}&page=${pageNum}&sort=${sort}`);
      const data = await res.json();
      if (pageNum === 1) {
        setPosts(data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    }
  }, [slug]);

  const loadUsers = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/posts/explore?tag=${encodeURIComponent(slug)}&page=${pageNum}&type=users`);
      const data = await res.json();
      if (pageNum === 1) {
        setUsers(data.users || []);
      } else {
        setUsers(prev => [...prev, ...(data.users || [])]);
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    }
  }, [slug]);

  const handleTabChange = async (tab: TagTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSearchResults(null);
    setLoading(true);
    setPage(1);

    if (tab === "popular") {
      await loadPosts(1, "trending");
    } else if (tab === "latest" || tab === "posts") {
      await loadPosts(1, "latest");
    } else if (tab === "users") {
      await loadUsers(1);
    }
    setLoading(false);
  };

  const loadMore = async () => {
    setLoadingMore(true);
    if (activeTab === "users") {
      await loadUsers(page + 1);
    } else {
      const sort = activeTab === "popular" ? "trending" : "latest";
      await loadPosts(page + 1, sort);
    }
    setLoadingMore(false);
  };

  const handleFollow = async () => {
    if (!tagInfo) return;
    const user = await requireAuth();
    if (!user) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    const res = await fetch(`/api/tags/${tagInfo.id}/follow`, { method: "POST" });
    if (!res.ok) {
      setIsFollowing(wasFollowing);
    }
  };

  // Search within tag
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}&type=posts&tag=${encodeURIComponent(slug)}`);
        const data = await res.json();
        setSearchResults(data.posts || []);
      } catch {
        // Silent
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const followButton = (
    <FollowButton following={isFollowing} onClick={handleFollow} variant="tag" />
  );

  return (
    <AppLayout
      hideRightSidebar
      headerTitle={tagInfo ? `#${tagInfo.name}` : `#${slug}`}
      headerRightAction={followButton}
    >
      {/* Search input */}
      <div className="px-3 sm:px-4 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-text-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`${tagInfo?.name || slug} ile alakalı daha fazla`}
            className="input-modern w-full !pl-10 pr-9 py-2.5 text-[0.9rem]"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchResults(null); setSearching(false); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-text-muted/30 flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5 text-bg-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[53px] z-20 bg-bg-primary sticky-ambient px-3 sm:px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "px-4 py-3 text-[0.97rem] font-bold whitespace-nowrap border-b-[2.5px] transition-colors",
                activeTab === tab.key
                  ? "border-accent-main text-text-primary"
                  : "border-transparent text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {searchQuery.trim().length >= 2 ? (
        // Search results
        searching ? (
          <div className="py-16 text-center">
            <span className="loader mx-auto" style={{ width: 24, height: 24 }} />
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="mt-1">
            {searchResults.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        ) : searchResults ? (
          <div className="py-16 text-center">
            <p className="text-sm text-text-muted">&quot;{searchQuery}&quot; için sonuç bulunamadı.</p>
          </div>
        ) : null
      ) : loading ? (
        activeTab === "users" ? (
          <div className="px-3 sm:px-4 pt-4"><UserListSkeleton count={6} /></div>
        ) : (
          <div className="mt-4"><PostGridSkeleton count={4} /></div>
        )
      ) : activeTab === "users" ? (
        // Users tab
        <div className="mt-2 px-3 sm:px-4">
          {users.length > 0 ? (
            <div className="space-y-0.5">
              {users.map(u => {
                const displayName = `@${u.username}`;
                return (
                  <Link
                    key={u.user_id}
                    href={`/u/${u.username}`}
                    className="group flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-bg-secondary rounded-[10px] transition"
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <img className="default-avatar-auto h-11 w-11 rounded-full object-cover shrink-0" alt="" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[0.9rem] font-semibold truncate group-hover:underline">{displayName}</p>
                        {u.is_verified && <VerifiedBadge variant={getBadgeVariant(u.premium_plan)} />}
                      </div>
                      <p className="text-xs text-text-muted truncate">@{u.username}</p>
                      {u.bio && <p className="text-[0.72rem] text-text-muted mt-0.5 line-clamp-1">{u.bio}</p>}
                    </div>
                  </Link>
                );
              })}
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-text-muted">Bu etikette kullanıcı bulunamadı.</p>
            </div>
          )}
        </div>
      ) : (
        // Posts tabs (popular, latest, posts)
        <div className="mt-1">
          {/* Moments grid section */}
          {tagMoments.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-3 sm:px-4 py-2">
                <span className="text-[0.88rem] font-bold">Moments</span>
                <Link href="/dashboard/moments" className="flex items-center gap-0.5 text-xs font-semibold text-text-muted hover:text-text-primary transition">
                  Tümünü gör <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {tagMoments.map(m => (
                  <MomentGridCard key={m.id} moment={m} />
                ))}
              </div>
            </div>
          )}
          {posts.length > 0 ? (
            <>
              {posts.map(post => <PostCard key={post.id} post={post} />)}
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </>
          ) : tagMoments.length === 0 ? (
            <div className="py-16 text-center">
              <Hash className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">Bu etikette gönderi bulunamadı.</p>
            </div>
          ) : null}
        </div>
      )}
    </AppLayout>
  );
}
