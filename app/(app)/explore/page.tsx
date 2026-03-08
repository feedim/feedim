"use client";

import { Suspense, useEffect, useLayoutEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { Search, X, Hash, ChevronRight, Music } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import MomentGridCard from "@/components/MomentGridCard";
import MomentsCarousel from "@/components/MomentsCarousel";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import { cn, formatCount } from "@/lib/utils";
import { encodeId } from "@/lib/hashId";
import UserListItem from "@/components/UserListItem";
import { useAuthModal } from "@/components/AuthModal";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";
import SoundPreviewButton from "@/components/SoundPreviewButton";
import { isBlockedContent } from "@/lib/blockedWords";
import { feedimAlert } from "@/components/FeedimAlert";

interface ExplorePost {
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
  trending_score?: number;
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

interface SearchUser {
  user_id: string;
  username: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  bio?: string;
}

interface SearchTag {
  id: number;
  name: string;
  slug: string;
  post_count: number;
  is_following?: boolean;
}

interface SearchSound {
  id: number;
  title: string;
  artist?: string | null;
  audio_url: string;
  duration?: number | null;
  usage_count?: number;
  cover_image_url?: string | null;
  is_original?: boolean;
  created_at?: string;
}

type ExploreTab = "for_you" | "latest" | "moments" | "video" | "notes" | "sounds" | "users" | "tags";

function SearchPrompt() {
  const t = useTranslations("explore");
  return (
    <div className="py-16 text-center">
      <Search className="h-10 w-10 text-text-muted mx-auto mb-3" />
      <p className="text-sm text-text-muted">{t("searchPrompt")}</p>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<AppLayout hideRightSidebar><div className="px-2.5 sm:px-3"><PostCardSkeleton count={5} /></div></AppLayout>}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const t = useTranslations("explore");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Tab state
  const [activeTab, setActiveTab] = useState<ExploreTab>(
    (searchParams.get("tab") as ExploreTab) || "for_you"
  );

  // Tag filter
  const [activeTag, setActiveTag] = useState<{ name: string; slug: string } | null>(null);

  // Explore data
  const [loading, setLoading] = useState(true);
  const [trendingPosts, setTrendingPosts] = useState<ExplorePost[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followedTagIds, setFollowedTagIds] = useState<Set<number>>(new Set());

  // Track which tabs have been loaded (lazy loading)
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(["for_you"]));

  // Latest tab
  const [latestPosts, setLatestPosts] = useState<ExplorePost[]>([]);
  const [latestLoading, setLatestLoading] = useState(false);
  const [latestPage, setLatestPage] = useState(1);
  const [latestHasMore, setLatestHasMore] = useState(false);

  // Moments tab
  const [momentTabPosts, setMomentTabPosts] = useState<any[]>([]);
  const [momentTabLoading, setMomentTabLoading] = useState(false);
  const [momentTabHasMore, setMomentTabHasMore] = useState(false);

  // Video tab
  const [videoPosts, setVideoPosts] = useState<ExplorePost[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoPage, setVideoPage] = useState(1);
  const [videoHasMore, setVideoHasMore] = useState(false);

  // Notes tab
  const [notePosts, setNotePosts] = useState<ExplorePost[]>([]);
  const [noteLoading, setNoteLoading] = useState(false);
  const [notePage, setNotePage] = useState(1);
  const [noteHasMore, setNoteHasMore] = useState(false);

  // Sounds tab
  const [sounds, setSounds] = useState<SearchSound[]>([]);
  const [soundsLoading, setSoundsLoading] = useState(false);
  const [soundsHasMore, setSoundsHasMore] = useState(false);

  // Search state
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [focused, setFocused] = useState(!!searchParams.get("q"));
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    users: SearchUser[];
    posts: ExplorePost[];
    tags: SearchTag[];
    sounds: SearchSound[];
  } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuthModal();

  // Batch interaction state (like/save)
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean; saved: boolean }>>({});
  const fetchedInteractionIds = useRef(new Set<number>());
  const cacheScope = `locale:${locale}`;

  const getScopedUrl = useCallback((url: string) => withCacheScope(url, cacheScope), [cacheScope]);

  useLayoutEffect(() => {
    const cached = readCache(getScopedUrl("/api/posts/explore?page=1")) as any;
    if (!cached?.posts) return;
    setTrendingPosts(cached.posts || []);
    setHasMore(cached.hasMore || false);
    setPage(1);
    setLoading(false);
  }, [getScopedUrl]);

  // Load explore data
  const loadExplore = useCallback(async (pageNum: number, tagSlug?: string) => {
    try {
      let url = `/api/posts/explore?page=${pageNum}`;
      if (tagSlug) url += `&tag=${encodeURIComponent(tagSlug)}`;
      const scopedUrl = getScopedUrl(url);
      if (pageNum === 1) {
      }
      const data = await fetchWithCache(scopedUrl, { ttlSeconds: 60, forceRefresh: pageNum > 1 }) as any;
      if (pageNum === 1) {
        setTrendingPosts(data.posts || []);
      } else {
        setTrendingPosts(prev => {
          const existing = new Set(prev.map(p => p.id));
          return [...prev, ...(data.posts || []).filter((p: ExplorePost) => !existing.has(p.id))];
        });
      }
      if (data.tag) {
        setActiveTag({ name: data.tag.name, slug: data.tag.slug });
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    }
  }, [getScopedUrl]);

  const loadFollowedTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags?followed=true");
      if (res.ok) {
        const data = await res.json();
        if (data.followedTagIds) {
          setFollowedTagIds(new Set(data.followedTagIds));
        }
      }
    } catch {
      // Silent
    }
  }, []);

  const loadMomentsTab = useCallback(async (cursor?: string) => {
    const scopedUrl = getScopedUrl(`/api/posts/moments?limit=10${cursor ? `&cursor=${cursor}` : ""}`);
    if (!cursor) {
      const cached = readCache(scopedUrl) as any;
      if (cached?.moments) {
        setMomentTabPosts(cached.moments || []);
        setMomentTabHasMore(cached.hasMore || false);
        setMomentTabLoading(false);
      } else {
        setMomentTabLoading(true);
      }
    } else {
      setMomentTabLoading(true);
    }
    try {
      const data = await fetchWithCache(scopedUrl, { ttlSeconds: 30, forceRefresh: !!cursor }) as any;
      if (cursor) {
        setMomentTabPosts(prev => {
          const existingIds = new Set(prev.map((m: any) => m.id));
          return [...prev, ...(data.moments || []).filter((m: any) => !existingIds.has(m.id))];
        });
      } else {
        setMomentTabPosts(data.moments || []);
      }
      setMomentTabHasMore(data.hasMore || false);
    } catch {} finally {
      setMomentTabLoading(false);
    }
  }, [getScopedUrl]);

  const loadLatestTab = useCallback(async (pageNum: number) => {
    const scopedUrl = getScopedUrl(`/api/posts/explore?page=${pageNum}&sort=latest`);
    if (pageNum === 1) {
      const cached = readCache(scopedUrl) as any;
      if (cached?.posts) {
        setLatestPosts(cached.posts || []);
        setLatestHasMore(cached.hasMore || false);
        setLatestPage(1);
        setLatestLoading(false);
      } else {
        setLatestLoading(true);
      }
    }
    try {
      const data = await fetchWithCache(scopedUrl, { ttlSeconds: 30, forceRefresh: pageNum > 1 }) as any;
      if (pageNum === 1) {
        setLatestPosts(data.posts || []);
      } else {
        setLatestPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...(data.posts || []).filter((p: ExplorePost) => !existingIds.has(p.id))];
        });
      }
      setLatestHasMore(data.hasMore || false);
      setLatestPage(pageNum);
    } catch {
      // Silent
    } finally {
      if (pageNum === 1) setLatestLoading(false);
    }
  }, [getScopedUrl]);

  const loadVideoTab = useCallback(async (pageNum: number) => {
    const scopedUrl = getScopedUrl(`/api/posts/explore?page=${pageNum}&content_type=video`);
    if (pageNum === 1) {
      const cached = readCache(scopedUrl) as any;
      if (cached?.posts) {
        setVideoPosts(cached.posts || []);
        setVideoHasMore(cached.hasMore || false);
        setVideoPage(1);
        setVideoLoading(false);
      } else {
        setVideoLoading(true);
      }
    }
    try {
      const data = await fetchWithCache(scopedUrl, { ttlSeconds: 30, forceRefresh: pageNum > 1 }) as any;
      if (pageNum === 1) {
        setVideoPosts(data.posts || []);
      } else {
        setVideoPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...(data.posts || []).filter((p: ExplorePost) => !existingIds.has(p.id))];
        });
      }
      setVideoHasMore(data.hasMore || false);
      setVideoPage(pageNum);
    } catch {
      // Silent
    } finally {
      if (pageNum === 1) setVideoLoading(false);
    }
  }, [getScopedUrl]);

  const loadNoteTab = useCallback(async (pageNum: number) => {
    const scopedUrl = getScopedUrl(`/api/posts/explore?page=${pageNum}&content_type=note`);
    if (pageNum === 1) {
      const cached = readCache(scopedUrl) as any;
      if (cached?.posts) {
        setNotePosts(cached.posts || []);
        setNoteHasMore(cached.hasMore || false);
        setNotePage(1);
        setNoteLoading(false);
      } else {
        setNoteLoading(true);
      }
    }
    try {
      const data = await fetchWithCache(scopedUrl, { ttlSeconds: 30, forceRefresh: pageNum > 1 }) as any;
      if (pageNum === 1) {
        setNotePosts(data.posts || []);
      } else {
        setNotePosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...(data.posts || []).filter((p: ExplorePost) => !existingIds.has(p.id))];
        });
      }
      setNoteHasMore(data.hasMore || false);
      setNotePage(pageNum);
    } catch {
      // Silent
    } finally {
      if (pageNum === 1) setNoteLoading(false);
    }
  }, [getScopedUrl]);

  const loadSoundsTab = useCallback(async (cursor?: string) => {
    const scopedUrl = getScopedUrl(`/api/sounds?sort=popular&limit=10${cursor ? `&cursor=${cursor}` : ""}`);
    if (!cursor) {
      const cached = readCache(scopedUrl) as any;
      if (cached?.sounds) {
        setSounds(cached.sounds || []);
        setSoundsHasMore(cached.hasMore || false);
        setSoundsLoading(false);
      } else {
        setSoundsLoading(true);
      }
    } else {
      setSoundsLoading(true);
    }
    try {
      const data = await fetchWithCache(scopedUrl, { ttlSeconds: 30, forceRefresh: !!cursor }) as any;
      if (cursor) {
        setSounds(prev => {
          const existingIds = new Set(prev.map(s => s.id));
          return [...prev, ...(data.sounds || []).filter((s: SearchSound) => !existingIds.has(s.id))];
        });
      } else {
        setSounds(data.sounds || []);
      }
      setSoundsHasMore(data.hasMore || false);
    } catch {} finally {
      setSoundsLoading(false);
    }
  }, [getScopedUrl]);

  useEffect(() => {
    const urlTag = searchParams.get("tag");
    const urlQ = searchParams.get("q");

    const init = async () => {
      setLoading(true);
      if (urlTag) {
        // Redirect to new tag page
        router.replace(`/explore/tag/${urlTag}`);
        return;
      } else {
        setActiveTag(null);
        await Promise.all([loadExplore(1), loadFollowedTags()]);
      }
      setLoading(false);

      if (urlQ && urlQ.trim().length >= 2) {
        doSearch(urlQ, activeTab);
      }
    };
    init();
  }, [searchParams]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("fdm-focus-search")) {
        sessionStorage.removeItem("fdm-focus-search");
        setFocused(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } catch {}
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  const isSearchMode = focused || query.trim().length > 0;
  const hasPrefix = query.trim().startsWith("#") || query.trim().startsWith("@");
  const isSearchActive = hasPrefix ? query.trim().length >= 2 : query.trim().length >= 2;

  useEffect(() => {
    if (isSearchActive || activeTag || activeTab === "for_you" || loadedTabs.has(activeTab)) return;
    setLoadedTabs(prev => new Set([...prev, activeTab]));
    if (activeTab === "moments") {
      void loadMomentsTab();
    } else if (activeTab === "latest") {
      void loadLatestTab(1);
    } else if (activeTab === "video") {
      void loadVideoTab(1);
    } else if (activeTab === "notes") {
      void loadNoteTab(1);
    } else if (activeTab === "sounds") {
      void loadSoundsTab();
    }
  }, [activeTab, activeTag, isSearchActive, loadedTabs, loadLatestTab, loadMomentsTab, loadNoteTab, loadSoundsTab, loadVideoTab]);

  // Fetch batch interactions for all loaded posts
  useEffect(() => {
    const allIds = [
      ...trendingPosts, ...latestPosts, ...videoPosts, ...notePosts,
      ...(searchResults?.posts || []),
    ].map(p => p.id).filter(id => id && !fetchedInteractionIds.current.has(id));
    const unique = [...new Set(allIds)];
    if (unique.length === 0) return;
    const toFetch = unique.slice(0, 50);
    toFetch.forEach(id => fetchedInteractionIds.current.add(id));
    fetch(`/api/posts/batch-interactions?ids=${toFetch.join(",")}`)
      .then(r => r.json())
      .then(data => {
        if (data.interactions) setInteractions(prev => ({ ...prev, ...data.interactions }));
      })
      .catch(() => {});
  }, [trendingPosts, latestPosts, videoPosts, notePosts, searchResults]);

  const loadMoreRef = useRef(false);
  const loadMore = async () => {
    if (loadMoreRef.current) return;
    const user = await requireAuth();
    if (!user) return;
    loadMoreRef.current = true;
    setLoadingMore(true);
    try {
      if (activeTab === "for_you" || activeTag) {
        await loadExplore(page + 1, activeTag?.slug);
      } else if (activeTab === "latest") {
        await loadLatestTab(latestPage + 1);
      } else if (activeTab === "video") {
        await loadVideoTab(videoPage + 1);
      } else if (activeTab === "notes") {
        await loadNoteTab(notePage + 1);
      }
    } finally {
      setLoadingMore(false);
      loadMoreRef.current = false;
    }
  };

  const clearTag = () => {
    setActiveTag(null);
    setTrendingPosts([]);
    setLoading(true);
    router.replace("/explore", { scroll: false });
    loadExplore(1).then(() => setLoading(false));
  };

  // Detect # or @ prefix for smart search
  const parseSearchPrefix = (value: string): { cleanQuery: string; forceType: string | null } => {
    const trimmed = value.trim();
    if (trimmed.startsWith("#") && trimmed.length >= 2) {
      return { cleanQuery: trimmed.slice(1), forceType: "tags" };
    }
    if (trimmed.startsWith("@") && trimmed.length >= 2) {
      return { cleanQuery: trimmed.slice(1), forceType: "users" };
    }
    return { cleanQuery: trimmed, forceType: null };
  };

  // Search — requires authentication
  const doSearch = async (value: string, tab: ExploreTab) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchAbortRef.current?.abort();
    const { cleanQuery, forceType } = parseSearchPrefix(value);
    if (!cleanQuery || cleanQuery.length < 1) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    const user = await requireAuth();
    if (!user) { setQuery(""); return; }

    setSearching(true);
    setSearchResults(null);
    // Map tab to search type + content_type
    let typeParam = forceType || "all";
    let contentTypeParam = "";
    if (!forceType) {
      if (tab === "for_you") { typeParam = "all"; }
      else if (tab === "latest") { typeParam = "posts"; }
      else if (tab === "video") { typeParam = "posts"; contentTypeParam = "video"; }
      else if (tab === "notes") { typeParam = "posts"; contentTypeParam = "note"; }
      else if (tab === "moments") { typeParam = "posts"; contentTypeParam = "moment"; }
      else { typeParam = tab; } // users, tags, sounds
    }
    searchTimeout.current = setTimeout(async () => {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      try {
        let url = `/api/search?q=${encodeURIComponent(cleanQuery)}&type=${typeParam}`;
        if (contentTypeParam) url += `&content_type=${contentTypeParam}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setSearchResults({
            users: data.users || [],
            posts: data.posts || [],
            tags: data.tags || [],
            sounds: data.sounds || [],
          });
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

  const updateUrl = (q: string, tab: ExploreTab) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (tab !== "for_you") params.set("tab", tab);
    const qs = params.toString();
    router.replace(`/explore${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const handleSearch = (value: string) => {
    setQuery(value);
    // Auto-switch tab based on prefix
    const trimmed = value.trim();
    if (trimmed.startsWith("#") && activeTab !== "tags") {
      setActiveTab("tags");
    } else if (trimmed.startsWith("@") && activeTab !== "users") {
      setActiveTab("users");
    }
    doSearch(value, trimmed.startsWith("#") ? "tags" : trimmed.startsWith("@") ? "users" : activeTab);
  };

  const handleSearchSubmit = () => {
    if (query.trim().length >= 2) {
      updateUrl(query, activeTab);
      doSearch(query, activeTab);
      inputRef.current?.blur();
    }
  };

  const handleTabChange = (tab: ExploreTab) => {
    setActiveTab(tab);
    if (query.trim().length >= 2) {
      updateUrl(query, tab);
      doSearch(query, tab);
    }
  };

  const clearSearch = () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchAbortRef.current?.abort();
    setQuery("");
    setSearchResults(null);
    setSearching(false);
    setFocused(false);
    // Reset to a tab visible in non-search mode if current tab is search-only
    if (activeTab !== "for_you") {
      setActiveTab("for_you");
    }
    router.replace("/explore", { scroll: false });
    inputRef.current?.blur();
  };

  const tabs: { key: ExploreTab; label: string }[] = isSearchActive
    ? [
        { key: "for_you", label: t("all") },
        { key: "users", label: t("users") },
        { key: "tags", label: t("tags") },
        { key: "latest", label: t("posts") },
        { key: "moments", label: t("moments") },
        { key: "video", label: t("video") },
        { key: "notes", label: t("notes") },
        { key: "sounds", label: t("sounds") },
      ]
    : [
        { key: "for_you", label: t("forYou") },
      ];

  const handleTagClick = (tag: SearchTag) => {
    emitNavigationStart();
    router.push(`/explore/tag/${tag.slug}`);
  };

  const handleTagFollow = async (e: React.MouseEvent, tagId: number) => {
    e.stopPropagation();
    const user = await requireAuth();
    if (!user) return;
    const wasFollowing = followedTagIds.has(tagId);
    setFollowedTagIds(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(tagId);
      else next.add(tagId);
      return next;
    });

    const res = await fetch(`/api/tags/${tagId}/follow`, { method: "POST" });
    if (!res.ok) {
      // Rollback
      setFollowedTagIds(prev => {
        const next = new Set(prev);
        if (wasFollowing) next.add(tagId);
        else next.delete(tagId);
        return next;
      });
      if (res.status === 403 || res.status === 429) {
        const data = await res.json().catch(() => ({}));
        feedimAlert("error", data.error);
      }
    }
  };

  const TagRow = ({ tag }: { tag: SearchTag }) => {
    return (
      <Link
        href={`/explore/tag/${tag.slug}`}
        className="flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-bg-secondary rounded-[10px] transition"
      >
        <div className="h-11 w-11 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
          <Hash className="h-5 w-5 text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.9rem] font-semibold">#{tag.name}</p>
          <p className="text-xs text-text-muted">{t("postCount", { count: formatCount(tag.post_count || 0) })}</p>
        </div>
      </Link>
    );
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const SoundRow = ({ sound }: { sound: SearchSound }) => (
    <Link
      href={`/sounds/${encodeId(sound.id)}`}
      className="flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-bg-secondary rounded-[10px] transition"
    >
      {sound.cover_image_url ? (
        <img suppressHydrationWarning data-src={sound.cover_image_url} alt="" className="lazyload h-11 w-11 rounded-lg object-cover bg-bg-tertiary shrink-0" />
      ) : (
        <div className="h-11 w-11 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
          <Music className="h-5 w-5 text-text-muted" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[0.9rem] font-semibold truncate">{sound.title}</p>
        <p className="text-xs text-text-muted truncate">
          {sound.artist || t("originalSound")}
          {sound.duration ? ` · ${formatDuration(sound.duration)}` : ""}
          {sound.usage_count ? ` · ${t("usageCount", { count: formatCount(sound.usage_count) })}` : ""}
        </p>
      </div>
      <SoundPreviewButton audioUrl={sound.audio_url} />
    </Link>
  );

  // Render tab content
  const renderTabContent = () => {
    // Search mode — loading skeleton (before results arrive or during tab switch)
    if (isSearchActive && searching) {
      if (activeTab === "users") {
        return (
          <div className="mt-4 space-y-0 px-3 sm:px-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="h-[40px] w-[40px] rounded-full bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-24 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-16 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );
      }
      if (activeTab === "tags") {
        return (
          <div className="mt-4 space-y-0 px-3 sm:px-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3">
                <div className="h-11 w-11 rounded-full bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-20 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-14 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );
      }
      if (activeTab === "sounds") {
        return (
          <div className="mt-4 space-y-0 px-3 sm:px-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-3">
                <div className="h-11 w-11 rounded-lg bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-28 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-20 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );
      }
      if (activeTab === "moments") {
        return (
          <div className="mt-2 grid grid-cols-3 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
            ))}
          </div>
        );
      }
      return <div className="px-2.5 sm:px-3"><PostCardSkeleton count={5} /></div>;
    }

    // Search mode — show results
    if (isSearchActive && searchResults) {
      const hasAny =
        (searchResults.users?.length || 0) > 0 ||
        (searchResults.posts?.length || 0) > 0 ||
        (searchResults.tags?.length || 0) > 0 ||
        (searchResults.sounds?.length || 0) > 0;

      if (!hasAny) {
        return (
          <div className="py-16 text-center">
            <p className="text-text-muted text-sm">{t("noResultsFor", { query })}</p>
          </div>
        );
      }

      if (activeTab === "for_you") {
        return (
          <div className="space-y-6 mt-4">
            {searchResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2 px-3 sm:px-4">{t("users")}</h3>
                <div className="space-y-0.5">
                  {searchResults.users.slice(0, 3).map(u => <UserListItem key={u.user_id} user={u} autoSubtitle />)}
                </div>
              </div>
            )}
            {searchResults.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2 px-3 sm:px-4">{t("tags")}</h3>
                <div className="space-y-0.5">
                  {searchResults.tags.slice(0, 3).map(tag => <TagRow key={tag.id} tag={tag} />)}
                </div>
              </div>
            )}
            {searchResults.sounds.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2 px-3 sm:px-4">{t("sounds")}</h3>
                <div className="space-y-0.5">
                  {searchResults.sounds.slice(0, 3).map(s => <SoundRow key={s.id} sound={s} />)}
                </div>
              </div>
            )}
            {searchResults.posts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2 px-3 sm:px-4">{t("contents")}</h3>
                <div className="flex flex-col gap-[16px] mt-[10px]">
                {searchResults.posts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map(post => <PostCard key={post.id} post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />)}
                </div>
              </div>
            )}
          </div>
        );
      }

      if (activeTab === "latest") {
        return (
          <div className="mt-1 flex flex-col gap-[16px] mt-[10px]">
            {searchResults.posts.length > 0 ? (
              searchResults.posts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map(post => <PostCard key={post.id} post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />)
            ) : (
              <p className="text-[0.8rem] text-text-muted text-center py-8 px-4">{t("noResults")}</p>
            )}
          </div>
        );
      }

      if (activeTab === "users") {
        return (
          <div className="mt-4 space-y-0.5 px-3 sm:px-4">
            {searchResults.users.length > 0 ? (
              searchResults.users.map(u => <UserListItem key={u.user_id} user={u} autoSubtitle />)
            ) : (
              <p className="text-[0.8rem] text-text-muted text-center py-8">{t("noUsersFound")}</p>
            )}
          </div>
        );
      }

      if (activeTab === "tags") {
        return (
          <div className="mt-4 space-y-0.5 px-3 sm:px-4">
            {searchResults.tags.length > 0 ? (
              searchResults.tags.map(tag => <TagRow key={tag.id} tag={tag} />)
            ) : (
              <p className="text-[0.8rem] text-text-muted text-center py-8">{t("noTagsFound")}</p>
            )}
          </div>
        );
      }

      if (activeTab === "sounds") {
        return (
          <div className="mt-4 space-y-0.5 px-3 sm:px-4">
            {searchResults.sounds.length > 0 ? (
              searchResults.sounds.map(s => <SoundRow key={s.id} sound={s} />)
            ) : (
              <p className="text-[0.8rem] text-text-muted text-center py-8">{t("noSoundsFound")}</p>
            )}
          </div>
        );
      }

      // video, notes, moments — API returns filtered by content_type
      if (activeTab === "video" || activeTab === "notes" || activeTab === "moments") {
        return (
          <div className="mt-1 flex flex-col gap-[16px] mt-[10px]">
            {searchResults.posts.length > 0 ? (
              searchResults.posts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map(post => <PostCard key={post.id} post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />)
            ) : (
              <p className="text-sm text-text-muted text-center py-8 px-4">{t("noResults")}</p>
            )}
          </div>
        );
      }
    }

    // Search prompt
    if (isSearchMode && !isSearchActive) {
      return <SearchPrompt />;
    }

    // Default explore content per tab
    if (loading) {
      return <div className="px-2.5 sm:px-3"><PostCardSkeleton count={5} /></div>;
    }

    // Tag filter mode
    if (activeTag) {
      return (
        <div className="mt-1">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-border-primary">
            <Hash className="h-4 w-4 text-text-muted" />
            <span className="text-sm font-semibold">#{activeTag.name}</span>
            <button onClick={clearTag} className="ml-auto text-xs text-text-muted hover:text-text-primary transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          {trendingPosts.length > 0 ? (
            <>
              <div className="flex flex-col gap-[16px] mt-[10px]">
              {trendingPosts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
                </div>
              ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} minLoadingMs={1000} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noPostsInTag")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "for_you") {
      return (
        <div className="mt-1">
          <MomentsCarousel />
          {trendingPosts.length > 0 ? (
            <>
              <div className="flex flex-col gap-[16px] mt-[10px]">
              {trendingPosts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
                </div>
              ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} minLoadingMs={1000} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noPostsYet")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "latest") {
      return (
        <div className="mt-1">
          {latestLoading && latestPosts.length === 0 ? (
            <div className="px-2.5 sm:px-3"><PostCardSkeleton count={5} /></div>
          ) : latestPosts.length > 0 ? (
            <>
              <div className="flex flex-col gap-[16px] mt-[10px]">
              {latestPosts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
                </div>
              ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={latestHasMore} minLoadingMs={1000} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noPostsYet")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "moments") {
      if (momentTabLoading && momentTabPosts.length === 0) {
        return (
          <div className="mt-2 grid grid-cols-3 gap-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <div key={i} className="aspect-[9/16] bg-bg-secondary rounded-sm animate-pulse" />
            ))}
          </div>
        );
      }
      return (
        <div className="mt-2">
          {momentTabPosts.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-0.5">
                {momentTabPosts.map(m => (
                  <MomentGridCard key={m.id} moment={m} />
                ))}
              </div>
              <LoadMoreTrigger
                onLoadMore={async () => {
                  const user = await requireAuth();
                  if (!user) return;
                  const last = momentTabPosts[momentTabPosts.length - 1];
                  if (last) loadMomentsTab(String(last.id));
                }}
                loading={momentTabLoading}
                hasMore={momentTabHasMore}
                minLoadingMs={1000}
              />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noMomentsYet")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "video") {
      return (
        <div className="mt-1">
          {videoLoading && videoPosts.length === 0 ? (
            <div className="px-2.5 sm:px-3"><PostCardSkeleton count={5} variant="video" /></div>
          ) : videoPosts.length > 0 ? (
            <>
              <div className="flex flex-col gap-[16px] mt-[10px]">
              {videoPosts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
                </div>
              ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={videoHasMore} minLoadingMs={1000} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noVideosYet")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "notes") {
      return (
        <div className="mt-1">
          {noteLoading && notePosts.length === 0 ? (
            <div className="px-2.5 sm:px-3"><PostCardSkeleton count={5} variant="note" /></div>
          ) : notePosts.length > 0 ? (
            <>
              <div className="flex flex-col gap-[16px] mt-[10px]">
              {notePosts.filter(post => !isBlockedContent(`${post.title || ""} ${post.excerpt || ""}`, post.profiles?.user_id)).map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} initialLiked={interactions[post.id]?.liked} initialSaved={interactions[post.id]?.saved} />
                </div>
              ))}
              </div>
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={noteHasMore} minLoadingMs={1000} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noNotesYet")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "sounds") {
      if (soundsLoading && sounds.length === 0) {
        return (
          <div className="mt-4 space-y-0 px-3 sm:px-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 py-3 px-3">
                <div className="h-11 w-11 rounded-lg bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-28 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-20 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="mt-4 px-3 sm:px-4">
          {sounds.length > 0 ? (
            <>
              <div className="space-y-0.5">
                {sounds.map(s => <SoundRow key={s.id} sound={s} />)}
              </div>
              <LoadMoreTrigger
                onLoadMore={async () => {
                  const user = await requireAuth();
                  if (!user) return;
                  const last = sounds[sounds.length - 1];
                  if (last) loadSoundsTab(String(last.id));
                }}
                loading={soundsLoading}
                hasMore={soundsHasMore}
                minLoadingMs={1000}
              />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">{t("noSoundsYet")}</p>
          )}
        </div>
      );
    }

    if (activeTab === "users") {
      return <SearchPrompt />;
    }

    return null;
  };

  return (
    <AppLayout hideRightSidebar scrollableHeader>
      {/* Search input */}
      <div className="flex items-center gap-2.5 mb-0 px-2 sm:px-2.5 pt-1">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-text-muted pointer-events-none" />
          <input
            data-hotkey="search"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={async () => { const user = await requireAuth(); if (!user) { inputRef.current?.blur(); return; } setFocused(true); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchSubmit(); } }}
            placeholder={t("searchPlaceholder")}
            className="input-modern w-full !pl-10 pr-9 py-2.5 text-[0.9rem]"
          />
          {query && (
            <button
              onClick={() => { searchAbortRef.current?.abort(); setQuery(""); setSearchResults(null); setSearching(false); if (activeTab !== "for_you") setActiveTab("for_you"); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-text-muted/30 flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5 text-bg-primary" />
            </button>
          )}
        </div>
        {isSearchMode && (
          <button onClick={clearSearch} className="text-[0.84rem] font-medium text-accent-main shrink-0 transition active:opacity-60">
            {t("cancel")}
          </button>
        )}
      </div>

      {/* Tabs — only show when searching (multiple tabs) */}
      {tabs.length > 1 && (
        <div className="z-20 px-3 sm:px-4 mt-1 overflow-x-auto scrollbar-hide">
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
      )}

      {/* Tab content */}
      {renderTabContent()}
    </AppLayout>
  );
}
