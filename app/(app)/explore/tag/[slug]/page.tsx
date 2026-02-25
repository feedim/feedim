"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X, Hash } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import MomentGridCard from "@/components/MomentGridCard";
import { cn } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { feedimAlert } from "@/components/FeedimAlert";
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
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
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
  role?: string;
  bio?: string;
}

type TagTab = "for-you" | "latest" | "posts" | "moments" | "video" | "notes" | "users";

export default function TagPage() {
  useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("explore");

  const [tagInfo, setTagInfo] = useState<{ id: number; name: string; slug: string; post_count: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TagTab>("for-you");

  // Shared posts state per tab
  const [posts, setPosts] = useState<TagPost[]>([]);
  const [postTypePosts, setPostTypePosts] = useState<TagPost[]>([]);
  const [users, setUsers] = useState<TagUser[]>([]);
  const [moments, setMoments] = useState<TagPost[]>([]);
  const [videos, setVideos] = useState<TagPost[]>([]);
  const [notes, setNotes] = useState<TagPost[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isFollowing, setIsFollowing] = useState(false);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TagPost[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();

  // Interaction states for batch fetching
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean; saved: boolean }>>({});
  const fetchedInteractionIds = useRef(new Set<number>());
  const { isLoggedIn } = useUser();

  const tabs: { key: TagTab; label: string }[] = [
    { key: "for-you", label: t("forYou") },
    { key: "latest", label: t("latest") },
    { key: "posts", label: t("posts") },
    { key: "moments", label: t("moments") },
    { key: "video", label: t("video") },
    { key: "notes", label: t("notes") },
    { key: "users", label: t("users") },
  ];

  // Batch-fetch liked/saved status
  const batchFetchInteractions = useCallback((items: TagPost[]) => {
    if (!isLoggedIn || items.length === 0) return;
    const newIds = items.map(p => p.id).filter(id => !fetchedInteractionIds.current.has(id));
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
  }, [isLoggedIn]);

  // Load tag info on mount
  useEffect(() => {
    if (!slug) return;
    const init = async () => {
      setLoading(true);
      try {
        const tagRes = await fetch(`/api/tags?q=${encodeURIComponent(slug)}`);
        const tagData = await tagRes.json();
        const found = (tagData.tags || []).find((t: { slug: string }) => t.slug === slug);
        if (found) {
          setTagInfo(found);
          const followRes = await fetch("/api/tags?followed=true");
          const followData = await followRes.json();
          if (followData.followedTagIds?.includes(found.id)) {
            setIsFollowing(true);
          }
        }
        // Load initial "for-you" posts
        await loadTagPosts(1, "trending");
        setLoadedTabs(new Set(["for-you"]));
      } catch {
        // Silent
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [slug]);

  // Batch fetch interactions when posts change
  useEffect(() => { batchFetchInteractions(posts); }, [posts]);
  useEffect(() => { batchFetchInteractions(postTypePosts); }, [postTypePosts]);
  useEffect(() => { batchFetchInteractions(videos); }, [videos]);
  useEffect(() => { batchFetchInteractions(notes); }, [notes]);

  const loadTagPosts = useCallback(async (pageNum: number, sort: string, contentType?: string) => {
    try {
      let url = `/api/posts/explore?tag=${encodeURIComponent(slug)}&page=${pageNum}&sort=${sort}`;
      if (contentType) url += `&content_type=${contentType}`;
      const res = await fetch(url);
      const data = await res.json();
      return { posts: data.posts || [], hasMore: data.hasMore || false };
    } catch {
      return { posts: [], hasMore: false };
    }
  }, [slug]);

  const loadTagUsers = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/posts/explore?tag=${encodeURIComponent(slug)}&page=${pageNum}&type=users`);
      const data = await res.json();
      return { users: data.users || [], hasMore: data.hasMore || false };
    } catch {
      return { users: [], hasMore: false };
    }
  }, [slug]);

  const handleTabChange = async (tab: TagTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSearchResults(null);
    setPage(1);

    // If already loaded, just switch — don't reload
    if (loadedTabs.has(tab)) {
      return;
    }

    setLoading(true);
    try {
      if (tab === "for-you") {
        const result = await loadTagPosts(1, "trending");
        setPosts(result.posts);
        setHasMore(result.hasMore);
      } else if (tab === "latest") {
        const result = await loadTagPosts(1, "latest");
        setPosts(result.posts);
        setHasMore(result.hasMore);
      } else if (tab === "posts") {
        const result = await loadTagPosts(1, "latest", "post");
        setPostTypePosts(result.posts);
        setHasMore(result.hasMore);
      } else if (tab === "moments") {
        const result = await loadTagPosts(1, "latest", "moment");
        setMoments(result.posts);
        setHasMore(result.hasMore);
      } else if (tab === "video") {
        const result = await loadTagPosts(1, "latest", "video");
        setVideos(result.posts);
        setHasMore(result.hasMore);
      } else if (tab === "notes") {
        const result = await loadTagPosts(1, "latest", "note");
        setNotes(result.posts);
        setHasMore(result.hasMore);
      } else if (tab === "users") {
        const result = await loadTagUsers(1);
        setUsers(result.users);
        setHasMore(result.hasMore);
      }
      setLoadedTabs(prev => new Set([...prev, tab]));
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    if (activeTab === "for-you") {
      const result = await loadTagPosts(nextPage, "trending");
      setPosts(prev => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } else if (activeTab === "latest") {
      const result = await loadTagPosts(nextPage, "latest");
      setPosts(prev => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } else if (activeTab === "posts") {
      const result = await loadTagPosts(nextPage, "latest", "post");
      setPostTypePosts(prev => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } else if (activeTab === "moments") {
      const result = await loadTagPosts(nextPage, "latest", "moment");
      setMoments(prev => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } else if (activeTab === "video") {
      const result = await loadTagPosts(nextPage, "latest", "video");
      setVideos(prev => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } else if (activeTab === "notes") {
      const result = await loadTagPosts(nextPage, "latest", "note");
      setNotes(prev => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
    } else if (activeTab === "users") {
      const result = await loadTagUsers(nextPage);
      setUsers(prev => [...prev, ...result.users]);
      setHasMore(result.hasMore);
    }

    setPage(nextPage);
    setLoadingMore(false);
  };

  const doTagFollow = async () => {
    if (!tagInfo) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    fetch(`/api/tags/${tagInfo.id}/follow`, { method: "POST", keepalive: true }).then(res => {
      if (!res.ok) setIsFollowing(wasFollowing);
    }).catch(() => setIsFollowing(wasFollowing));
  };

  const handleFollow = async () => {
    if (!tagInfo) return;
    if (!currentUser) { const user = await requireAuth(); if (!user) return; }
    if (isFollowing) {
      feedimAlert("question", t("unfollowTagConfirm", { tag: tagInfo.name }), {
        showYesNo: true,
        onYes: doTagFollow,
      });
      return;
    }
    doTagFollow();
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

  // Get current tab's post list
  const getCurrentPosts = () => {
    if (activeTab === "posts") return postTypePosts;
    if (activeTab === "moments") return moments;
    if (activeTab === "video") return videos;
    if (activeTab === "notes") return notes;
    return posts; // for-you & latest share posts state
  };

  const renderPostList = (items: TagPost[]) => (
    items.length > 0 ? (
      <>
        <div className="flex flex-col gap-[40px]">
          {items.map(post => (
            <PostCard
              key={post.id}
              post={post}
              initialLiked={interactions[post.id]?.liked}
              initialSaved={interactions[post.id]?.saved}
            />
          ))}
        </div>
        <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
      </>
    ) : (
      <div className="py-16 text-center">
        <Hash className="h-10 w-10 text-text-muted mx-auto mb-3" />
        <p className="text-sm text-text-muted">{t("noContentInTag")}</p>
      </div>
    )
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
            data-hotkey="search"
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t("searchInTag", { tag: tagInfo?.name || slug })}
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
          <div className="mt-1 flex flex-col gap-[40px]">
            {searchResults.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        ) : searchResults ? (
          <div className="py-16 text-center">
            <p className="text-sm text-text-muted">{t("noResultsFor", { query: searchQuery })}</p>
          </div>
        ) : null
      ) : loading ? (
        <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
      ) : activeTab === "users" ? (
        // Users tab
        <div className="mt-2 px-3 sm:px-4">
          {users.length > 0 ? (
            <div className="space-y-0.5">
              {users.map(u => (
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
                      <p className="text-[0.9rem] font-semibold truncate group-hover:underline">@{u.username}</p>
                      {u.is_verified && <VerifiedBadge variant={getBadgeVariant(u.premium_plan)} role={u.role} />}
                    </div>
                    <p className="text-xs text-text-muted truncate">{u.full_name || u.username}</p>
                    {u.bio && <p className="text-[0.72rem] text-text-muted mt-0.5 line-clamp-1">{u.bio}</p>}
                  </div>
                </Link>
              ))}
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-text-muted">{t("noUsersInTag")}</p>
            </div>
          )}
        </div>
      ) : activeTab === "moments" ? (
        // Moments tab — grid layout
        <div className="-mx-0 sm:mx-0">
          {moments.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-0.5">
                {moments.map(m => (
                  <MomentGridCard key={m.id} moment={m} />
                ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </>
          ) : (
            <div className="py-16 text-center">
              <Hash className="h-10 w-10 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">{t("noMomentsInTag")}</p>
            </div>
          )}
        </div>
      ) : (
        // For-you, Latest, Video, Notes — PostCard list
        <div className="mt-1">
          {renderPostList(getCurrentPosts())}
        </div>
      )}
    </AppLayout>
  );
}
