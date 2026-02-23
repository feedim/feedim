"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
import { Search, X, Hash, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import PostCard from "@/components/PostCard";
import MomentGridCard from "@/components/MomentGridCard";
import MomentsCarousel from "@/components/MomentsCarousel";
import { PostGridSkeleton, MomentGridSkeleton } from "@/components/Skeletons";
import LoadingShell from "@/components/LoadingShell";
import { cn, formatCount } from "@/lib/utils";
import UserListItem from "@/components/UserListItem";
import { useAuthModal } from "@/components/AuthModal";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { fetchWithCache } from "@/lib/fetchWithCache";
import { FeedAdSlot } from "@/components/AdBanner";

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
  profiles?: {
    user_id: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
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

type ExploreTab = "for_you" | "users" | "tags" | "posts" | "moments";

function SearchPrompt() {
  return (
    <div className="py-16 text-center">
      <Search className="h-10 w-10 text-text-muted mx-auto mb-3" />
      <p className="text-sm text-text-muted">Arama yapmak için yazmaya başlayın.</p>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<AppLayout hideRightSidebar><PostGridSkeleton count={4} /></AppLayout>}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
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
  const [trendingTags, setTrendingTags] = useState<SearchTag[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [followedTagIds, setFollowedTagIds] = useState<Set<number>>(new Set());

  // Moments tab
  const [momentTabPosts, setMomentTabPosts] = useState<any[]>([]);
  const [momentTabLoading, setMomentTabLoading] = useState(false);
  const [momentTabLoaded, setMomentTabLoaded] = useState(false);
  const [momentTabHasMore, setMomentTabHasMore] = useState(false);

  // Search state
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [focused, setFocused] = useState(!!searchParams.get("q"));
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    users: SearchUser[];
    posts: ExplorePost[];
    tags: SearchTag[];
  } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuthModal();

  // Load explore data
  const loadExplore = useCallback(async (pageNum: number, tagSlug?: string) => {
    try {
      let url = `/api/posts/explore?page=${pageNum}`;
      if (tagSlug) url += `&tag=${encodeURIComponent(tagSlug)}`;
      const data = await fetchWithCache(url, { ttlSeconds: 60, forceRefresh: pageNum > 1 }) as any;
      if (pageNum === 1) {
        setTrendingPosts(data.posts || []);
      } else {
        setTrendingPosts(prev => [...prev, ...(data.posts || [])]);
      }
      if (data.tag) {
        setActiveTag({ name: data.tag.name, slug: data.tag.slug });
      }
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch {
      // Silent
    }
  }, []);

  const loadTrendingTags = useCallback(async () => {
    try {
      const [tagsRes, followsRes] = await Promise.all([
        fetch("/api/tags"),
        fetch("/api/tags?followed=true"),
      ]);
      const tagsData = await tagsRes.json();
      setTrendingTags((tagsData.tags || []).slice(0, 15));

      if (followsRes.ok) {
        const followsData = await followsRes.json();
        if (followsData.followedTagIds) {
          setFollowedTagIds(new Set(followsData.followedTagIds));
        }
      }
    } catch {
      // Silent
    }
  }, []);

  const loadMomentsTab = useCallback(async (cursor?: string) => {
    setMomentTabLoading(true);
    try {
      let url = `/api/posts/moments?limit=12`;
      if (cursor) url += `&cursor=${cursor}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (cursor) {
        setMomentTabPosts(prev => [...prev, ...(data.moments || [])]);
      } else {
        setMomentTabPosts(data.moments || []);
      }
      setMomentTabHasMore(data.hasMore || false);
    } catch {} finally {
      setMomentTabLoading(false);
      setMomentTabLoaded(true);
    }
  }, []);

  useEffect(() => {
    const urlTag = searchParams.get("tag");
    const urlQ = searchParams.get("q");

    const init = async () => {
      setLoading(true);
      if (urlTag) {
        // Redirect to new tag page
        router.replace(`/dashboard/explore/tag/${urlTag}`);
        return;
      } else {
        setActiveTag(null);
        await Promise.all([loadExplore(1), loadTrendingTags()]);
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

  const loadMore = async () => {
    setLoadingMore(true);
    await loadExplore(page + 1, activeTag?.slug);
    setLoadingMore(false);
  };

  const clearTag = () => {
    setActiveTag(null);
    setTrendingPosts([]);
    setLoading(true);
    router.replace("/dashboard/explore", { scroll: false });
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
    const { cleanQuery, forceType } = parseSearchPrefix(value);
    if (!cleanQuery || cleanQuery.length < 1) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    const user = await requireAuth();
    if (!user) { setQuery(""); return; }

    setSearching(true);
    const typeParam = forceType || (tab === "for_you" ? "all" : tab === "posts" ? "posts" : tab);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(cleanQuery)}&type=${typeParam}`);
        const data = await res.json();
        setSearchResults({
          users: data.users || [],
          posts: data.posts || [],
          tags: data.tags || [],
        });
      } catch {
        // Silent
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const updateUrl = (q: string, tab: ExploreTab) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (tab !== "for_you") params.set("tab", tab);
    const qs = params.toString();
    router.replace(`/dashboard/explore${qs ? `?${qs}` : ""}`, { scroll: false });
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
    if (tab === "moments" && !momentTabLoaded) {
      loadMomentsTab();
    }
    if (query.trim().length >= 2) {
      updateUrl(query, tab);
      doSearch(query, tab);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSearchResults(null);
    setSearching(false);
    setFocused(false);
    router.replace("/dashboard/explore", { scroll: false });
    inputRef.current?.blur();
  };

  const isSearchMode = focused || query.trim().length > 0;
  const hasPrefix = query.trim().startsWith("#") || query.trim().startsWith("@");
  const isSearchActive = hasPrefix ? query.trim().length >= 2 : query.trim().length >= 2;

  const tabs: { key: ExploreTab; label: string }[] = [
    { key: "for_you", label: "Sana Özel" },
    { key: "users", label: "Kişiler" },
    { key: "tags", label: "Etiketler" },
    { key: "posts", label: "Gönderiler" },
    { key: "moments", label: "Moments" },
  ];

  const handleTagClick = (tag: SearchTag) => {
    emitNavigationStart();
    router.push(`/dashboard/explore/tag/${tag.slug}`);
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
    }
  };

  const TagRow = ({ tag }: { tag: SearchTag }) => {
    return (
      <Link
        href={`/dashboard/explore/tag/${tag.slug}`}
        className="flex items-center gap-3 py-2.5 px-3 -mx-3 hover:bg-bg-secondary rounded-[10px] transition"
      >
        <div className="h-11 w-11 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
          <Hash className="h-5 w-5 text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.9rem] font-semibold">#{tag.name}</p>
          <p className="text-xs text-text-muted">{formatCount(tag.post_count || 0)} gönderi</p>
        </div>
      </Link>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    // Search mode
    if (isSearchActive && searchResults) {
      const hasAny =
        (searchResults.users?.length || 0) > 0 ||
        (searchResults.posts?.length || 0) > 0 ||
        (searchResults.tags?.length || 0) > 0;

      if (searching && !searchResults) {
        return (
          <div className="py-16 text-center">
            <span className="loader mx-auto" style={{ width: 24, height: 24 }} />
          </div>
        );
      }

      if (!hasAny) {
        return (
          <div className="py-16 text-center">
            <p className="text-text-muted text-sm">&quot;{query}&quot; için sonuç bulunamadı.</p>
          </div>
        );
      }

      if (activeTab === "for_you") {
        return (
          <div className="space-y-6 mt-4 px-3 sm:px-4">
            {searchResults.users.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2">Kişiler</h3>
                <div className="space-y-0.5">
                  {searchResults.users.slice(0, 3).map(u => <UserListItem key={u.user_id} user={u} autoSubtitle />)}
                </div>
              </div>
            )}
            {searchResults.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2">Etiketler</h3>
                <div className="space-y-0.5">
                  {searchResults.tags.slice(0, 3).map(tag => <TagRow key={tag.id} tag={tag} />)}
                </div>
              </div>
            )}
            {searchResults.posts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-muted mb-2">Gönderiler</h3>
                {searchResults.posts.map(post => <PostCard key={post.id} post={post} />)}
              </div>
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
              <p className="text-sm text-text-muted text-center py-8">Kullanıcı bulunamadı.</p>
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
              <p className="text-sm text-text-muted text-center py-8">Etiket bulunamadı.</p>
            )}
          </div>
        );
      }

      if (activeTab === "posts") {
        return (
          <div className="mt-1">
            {searchResults.posts.length > 0 ? (
              searchResults.posts.map(post => <PostCard key={post.id} post={post} />)
            ) : (
              <p className="text-sm text-text-muted text-center py-8 px-4">Gönderi bulunamadı.</p>
            )}
          </div>
        );
      }
    }

    // Searching
    if (isSearchActive && searching) {
      return (
        <div className="flex items-center justify-center py-32">
          <span className="loader" style={{ width: 22, height: 22 }} />
        </div>
      );
    }

    // Search prompt
    if (isSearchMode && !isSearchActive) {
      return <SearchPrompt />;
    }

    // Default explore content per tab
    if (loading) {
      return <LoadingShell><div className="mt-4"><PostGridSkeleton count={4} /></div></LoadingShell>;
    }

    // Tag filter mode
    if (activeTag) {
      const activeTagObj = trendingTags.find(t => t.slug === activeTag.slug);
      const isFollowingTag = activeTagObj ? followedTagIds.has(activeTagObj.id) : false;
      return (
        <div className="mt-1">
          <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-border-primary">
            <Hash className="h-4 w-4 text-text-muted" />
            <span className="text-sm font-semibold">#{activeTag.name}</span>
            {activeTagObj && (
              <button
                onClick={(e) => handleTagFollow(e, activeTagObj.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold transition",
                  isFollowingTag
                    ? "bg-bg-tertiary text-text-primary"
                    : "bg-bg-inverse text-bg-primary"
                )}
              >
                {isFollowingTag ? "Takipte" : "Takip Et"}
              </button>
            )}
            <button onClick={clearTag} className="ml-auto text-xs text-text-muted hover:text-text-primary transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <LoadingShell><div className="mt-4"><PostGridSkeleton count={4} /></div></LoadingShell>
          ) : trendingPosts.length > 0 ? (
            <>
              {trendingPosts.map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} />
                  <FeedAdSlot index={index} />
                </div>
              ))}
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">Bu etikette gönderi bulunamadı.</p>
          )}
        </div>
      );
    }

    if (activeTab === "for_you") {
      return (
        <div className="mt-1">
          {/* Moments carousel */}
          <MomentsCarousel />
          {trendingPosts.length > 0 ? (
            <>
              {trendingPosts.map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} />
                  <FeedAdSlot index={index} />
                </div>
              ))}
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">Henüz gönderi yok.</p>
          )}
        </div>
      );
    }

    if (activeTab === "users") {
      return <SearchPrompt />;
    }

    if (activeTab === "tags") {
      return (
        <div className="mt-4 px-5 sm:px-6">
          {trendingTags.length > 0 ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-accent-main" />
                <span className="text-sm font-semibold text-text-muted">Gündemdekiler</span>
              </div>
              <div className="space-y-0.5">
                {trendingTags.map(tag => <TagRow key={tag.id} tag={tag} />)}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">Henüz etiket yok.</p>
          )}
        </div>
      );
    }

    if (activeTab === "posts") {
      return (
        <div className="mt-1">
          {trendingPosts.length > 0 ? (
            <>
              {trendingPosts.map((post, index) => (
                <div key={post.id}>
                  <PostCard post={post} />
                  <FeedAdSlot index={index} />
                </div>
              ))}
              <LoadMoreTrigger onLoadMore={loadMore} loading={loadingMore} hasMore={hasMore} />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">Henüz gönderi yok.</p>
          )}
        </div>
      );
    }

    if (activeTab === "moments") {
      if (momentTabLoading && !momentTabLoaded) {
        return <div className="mt-2"><MomentGridSkeleton count={9} /></div>;
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
                onLoadMore={() => {
                  const last = momentTabPosts[momentTabPosts.length - 1];
                  if (last) loadMomentsTab(String(last.id));
                }}
                loading={momentTabLoading}
                hasMore={momentTabHasMore}
              />
            </>
          ) : (
            <p className="text-sm text-text-muted py-8 text-center">Henüz moment yok.</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <AppLayout hideRightSidebar scrollableHeader>
      {/* Search input */}
      <div className="flex items-center gap-2.5 mb-0 px-3 sm:px-4 pt-2">
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
            placeholder="#etiket veya @kullanıcı ara..."
            className="input-modern w-full !pl-10 pr-9 py-2.5 text-[0.9rem]"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setSearchResults(null); setSearching(false); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-text-muted/30 flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5 text-bg-primary" />
            </button>
          )}
        </div>
        {isSearchMode && (
          <button onClick={clearSearch} className="text-[0.84rem] font-medium text-accent-main shrink-0 transition active:opacity-60">
            Vazgeç
          </button>
        )}
      </div>

      {/* Tabs — always visible */}
      <div className="sticky top-[53px] z-20 bg-bg-primary sticky-ambient px-3 sm:px-4 mt-1 overflow-x-auto scrollbar-hide">
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

      {/* Tab content */}
      {renderTabContent()}
    </AppLayout>
  );
}
