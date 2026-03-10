"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Search, X, Hash } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import MomentGridCard from "@/components/MomentGridCard";
import { cn } from "@/lib/utils";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { feedimAlert } from "@/components/FeedimAlert";
import { isBlockedContent } from "@/lib/blockedWords";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import FollowButton from "@/components/FollowButton";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";

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
  viewer_liked?: boolean;
  viewer_saved?: boolean;
  profiles?: {
    user_id: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
}

type TagTab = "for-you" | "latest" | "posts" | "moments" | "video" | "notes";

export default function TagPage() {
  useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const t = useTranslations("explore");
  const locale = useLocale();

  const [tagInfo, setTagInfo] = useState<{ id: number; name: string; slug: string; post_count: number } | null>(null);
  const [activeTab, setActiveTab] = useState<TagTab>("for-you");

  // Posts state per tab
  const [forYouPosts, setForYouPosts] = useState<TagPost[]>([]);
  const [latestPosts, setLatestPosts] = useState<TagPost[]>([]);
  const [postTypePosts, setPostTypePosts] = useState<TagPost[]>([]);
  const [moments, setMoments] = useState<TagPost[]>([]);
  const [videos, setVideos] = useState<TagPost[]>([]);
  const [notes, setNotes] = useState<TagPost[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tabHasMore, setTabHasMore] = useState<Record<TagTab, boolean>>({ "for-you": false, latest: false, posts: false, moments: false, video: false, notes: false });
  const [tabPage, setTabPage] = useState<Record<TagTab, number>>({ "for-you": 1, latest: 1, posts: 1, moments: 1, video: 1, notes: 1 });
  const [isFollowing, setIsFollowing] = useState(false);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TagPost[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const cacheScope = currentUser?.id ? `locale:${locale}:user:${currentUser.id}:pi2` : `locale:${locale}:guest:pi2`;

  const getTagPostsUrl = useCallback((pageNum: number, sort: string, contentType?: string) => {
    let url = `/api/posts/explore?tag=${encodeURIComponent(slug)}&page=${pageNum}&sort=${sort}`;
    if (contentType) url += `&content_type=${contentType}`;
    return withCacheScope(url, cacheScope);
  }, [cacheScope, slug]);

  useLayoutEffect(() => {
    if (!slug) return;
    const cached = readCache(getTagPostsUrl(1, "trending")) as any;
    if (!cached?.posts) return;
    if (cached.tag) setTagInfo(cached.tag);
    setForYouPosts(cached.posts || []);
    setTabHasMore(prev => ({ ...prev, "for-you": cached.hasMore || false }));
    setLoadedTabs(new Set(["for-you"]));
    setLoading(false);
  }, [getTagPostsUrl, slug]);

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
  ];

  // Batch-fetch liked/saved status
  const batchFetchInteractions = useCallback((items: TagPost[]) => {
    if (!isLoggedIn || items.length === 0) return;
    const newIds = items
      .filter((item) => (
        typeof item.viewer_liked !== "boolean" ||
        typeof item.viewer_saved !== "boolean"
      ) && !fetchedInteractionIds.current.has(item.id))
      .map((item) => item.id);
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
  }, [isLoggedIn]);

  // Load tag info on mount
  useEffect(() => {
    if (!slug) return;
    const init = async () => {
      setLoading(true);
      try {
        const result = await loadTagPosts(1, "trending");
        if (result.tag) {
          setTagInfo(result.tag);
          const followRes = await fetch("/api/tags?followed=true");
          const followData = await followRes.json();
          if (followData.followedTagIds?.includes(result.tag.id)) {
            setIsFollowing(true);
          }
        }
        setForYouPosts(result.posts);
        setTabHasMore(prev => ({ ...prev, "for-you": result.hasMore }));
      } catch {
        // Silent
      } finally {
        setLoadedTabs(new Set(["for-you"]));
        setLoading(false);
      }
    };
    init();
  }, [slug]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  // Batch fetch interactions when posts change
  useEffect(() => { batchFetchInteractions(forYouPosts); }, [forYouPosts]);
  useEffect(() => { batchFetchInteractions(latestPosts); }, [latestPosts]);
  useEffect(() => { batchFetchInteractions(postTypePosts); }, [postTypePosts]);
  useEffect(() => { batchFetchInteractions(videos); }, [videos]);
  useEffect(() => { batchFetchInteractions(notes); }, [notes]);

  const loadTagPosts = useCallback(async (pageNum: number, sort: string, contentType?: string) => {
    try {
      const url = getTagPostsUrl(pageNum, sort, contentType);
      const data = await fetchWithCache(url, { ttlSeconds: 60, forceRefresh: pageNum > 1 }) as any;
      return { posts: data.posts || [], hasMore: data.hasMore || false, tag: data.tag || null };
    } catch {
      return { posts: [], hasMore: false, tag: null };
    }
  }, [getTagPostsUrl]);

  const handleTabChange = async (tab: TagTab) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSearchResults(null);
    let seededFromCache = false;

    // If already loaded, just switch — don't reload
    if (loadedTabs.has(tab)) {
      return;
    }

    if (tab === "for-you") {
      const cached = readCache(getTagPostsUrl(1, "trending")) as any;
      if (cached?.posts) {
        setForYouPosts(cached.posts || []);
        setTabHasMore(prev => ({ ...prev, "for-you": cached.hasMore || false }));
        seededFromCache = true;
      }
    } else if (tab === "latest") {
      const cached = readCache(getTagPostsUrl(1, "latest")) as any;
      if (cached?.posts) {
        setLatestPosts(cached.posts || []);
        setTabHasMore(prev => ({ ...prev, latest: cached.hasMore || false }));
        seededFromCache = true;
      }
    } else if (tab === "posts") {
      const cached = readCache(getTagPostsUrl(1, "trending", "post")) as any;
      if (cached?.posts) {
        setPostTypePosts(cached.posts || []);
        setTabHasMore(prev => ({ ...prev, posts: cached.hasMore || false }));
        seededFromCache = true;
      }
    } else if (tab === "moments") {
      const cached = readCache(getTagPostsUrl(1, "trending", "moment")) as any;
      if (cached?.posts) {
        setMoments(cached.posts || []);
        setTabHasMore(prev => ({ ...prev, moments: cached.hasMore || false }));
        seededFromCache = true;
      }
    } else if (tab === "video") {
      const cached = readCache(getTagPostsUrl(1, "trending", "video")) as any;
      if (cached?.posts) {
        setVideos(cached.posts || []);
        setTabHasMore(prev => ({ ...prev, video: cached.hasMore || false }));
        seededFromCache = true;
      }
    } else if (tab === "notes") {
      const cached = readCache(getTagPostsUrl(1, "trending", "note")) as any;
      if (cached?.posts) {
        setNotes(cached.posts || []);
        setTabHasMore(prev => ({ ...prev, notes: cached.hasMore || false }));
        seededFromCache = true;
      }
    }

    setLoading(!seededFromCache);
    try {
      if (tab === "for-you") {
        const result = await loadTagPosts(1, "trending");
        setForYouPosts(result.posts);
        setTabHasMore(prev => ({ ...prev, "for-you": result.hasMore }));
      } else if (tab === "latest") {
        const result = await loadTagPosts(1, "latest");
        setLatestPosts(result.posts);
        setTabHasMore(prev => ({ ...prev, latest: result.hasMore }));
      } else if (tab === "posts") {
        const result = await loadTagPosts(1, "trending", "post");
        setPostTypePosts(result.posts);
        setTabHasMore(prev => ({ ...prev, posts: result.hasMore }));
      } else if (tab === "moments") {
        const result = await loadTagPosts(1, "trending", "moment");
        setMoments(result.posts);
        setTabHasMore(prev => ({ ...prev, moments: result.hasMore }));
      } else if (tab === "video") {
        const result = await loadTagPosts(1, "trending", "video");
        setVideos(result.posts);
        setTabHasMore(prev => ({ ...prev, video: result.hasMore }));
      } else if (tab === "notes") {
        const result = await loadTagPosts(1, "trending", "note");
        setNotes(result.posts);
        setTabHasMore(prev => ({ ...prev, notes: result.hasMore }));
      }
    } catch {
      // Silent
    } finally {
      setLoadedTabs(prev => new Set([...prev, tab]));
      setLoading(false);
    }
  };

  const loadMore = async () => {
    const user = await requireAuth();
    if (!user) return;
    setLoadingMore(true);
    const nextPage = tabPage[activeTab] + 1;

    const dedup = (prev: TagPost[], newPosts: TagPost[]) => {
      const existingIds = new Set(prev.map(p => p.id));
      return [...prev, ...newPosts.filter(p => !existingIds.has(p.id))];
    };

    if (activeTab === "for-you") {
      const result = await loadTagPosts(nextPage, "trending");
      setForYouPosts(prev => dedup(prev, result.posts));
      setTabHasMore(prev => ({ ...prev, "for-you": result.hasMore }));
    } else if (activeTab === "latest") {
      const result = await loadTagPosts(nextPage, "latest");
      setLatestPosts(prev => dedup(prev, result.posts));
      setTabHasMore(prev => ({ ...prev, latest: result.hasMore }));
    } else if (activeTab === "posts") {
      const result = await loadTagPosts(nextPage, "trending", "post");
      setPostTypePosts(prev => dedup(prev, result.posts));
      setTabHasMore(prev => ({ ...prev, posts: result.hasMore }));
    } else if (activeTab === "moments") {
      const result = await loadTagPosts(nextPage, "trending", "moment");
      setMoments(prev => dedup(prev, result.posts));
      setTabHasMore(prev => ({ ...prev, moments: result.hasMore }));
    } else if (activeTab === "video") {
      const result = await loadTagPosts(nextPage, "trending", "video");
      setVideos(prev => dedup(prev, result.posts));
      setTabHasMore(prev => ({ ...prev, video: result.hasMore }));
    } else if (activeTab === "notes") {
      const result = await loadTagPosts(nextPage, "trending", "note");
      setNotes(prev => dedup(prev, result.posts));
      setTabHasMore(prev => ({ ...prev, notes: result.hasMore }));
    }

    setTabPage(prev => ({ ...prev, [activeTab]: nextPage }));
    setLoadingMore(false);
  };

  const doTagFollow = async () => {
    if (!tagInfo) return;
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    fetch(`/api/tags/${tagInfo.id}/follow`, { method: "POST", keepalive: true }).then(res => {
      if (!res.ok) {
        setIsFollowing(wasFollowing);
        if (res.status === 403 || res.status === 429) {
          res.json().then(data => feedimAlert("error", data.error)).catch(() => {});
        }
      }
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
    searchAbortRef.current?.abort();
    if (!value.trim() || value.trim().length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}&type=posts&tag=${encodeURIComponent(slug)}`, { signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setSearchResults(data.posts || []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 300);
  };

  const followButton = (
    <FollowButton following={isFollowing} onClick={handleFollow} variant="tag" />
  );

  // Get current tab's post list
  const getCurrentPosts = () => {
    if (activeTab === "for-you") return forYouPosts;
    if (activeTab === "latest") return latestPosts;
    if (activeTab === "posts") return postTypePosts;
    if (activeTab === "moments") return moments;
    if (activeTab === "video") return videos;
    if (activeTab === "notes") return notes;
    return forYouPosts;
  };

  const activeTabLoaded = loadedTabs.has(activeTab);

  const renderPostList = (items: TagPost[]) => (
    !activeTabLoaded ? (
      <PostCardSkeleton count={5} />
    ) : items.length > 0 ? (
      <>
        <div className="flex flex-col gap-[16px] mt-[10px]">
          {items.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id, currentUser?.id)).map(post => (
            <PostCard
              key={post.id}
              post={post}
              initialLiked={interactions[post.id]?.liked}
              initialSaved={interactions[post.id]?.saved}
            />
          ))}
        </div>
        <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={tabHasMore[activeTab]} />
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
              onClick={() => { searchAbortRef.current?.abort(); setSearchQuery(""); setSearchResults(null); setSearching(false); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-text-muted/30 flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5 text-bg-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="z-20 px-3 sm:px-4 overflow-x-auto scrollbar-hide">
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
          activeTab === "moments" ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
              ))}
            </div>
          ) : (
            <PostCardSkeleton count={5} />
          )
        ) : searchResults && searchResults.length > 0 ? (
          <div className="mt-1 flex flex-col gap-[16px] mt-[10px]">
            {searchResults.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id, currentUser?.id)).map(post => <PostCard key={post.id} post={post} />)}
          </div>
        ) : searchResults ? (
          <div className="py-16 text-center">
            <p className="text-sm text-text-muted">{t("noResultsFor", { query: searchQuery })}</p>
          </div>
        ) : null
      ) : loading ? (
        activeTab === "moments" ? (
          <div className="-mx-0 sm:mx-0">
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <PostCardSkeleton count={5} />
        )
      ) : activeTab === "moments" ? (
        // Moments tab — grid layout
        <div className="-mx-0 sm:mx-0">
          {!activeTabLoaded ? (
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
              ))}
            </div>
          ) : moments.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-0.5">
                {moments.map(m => (
                  <MomentGridCard key={m.id} moment={m} />
                ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={tabHasMore[activeTab]} />
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
