"use client";

import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import UserListItem from "@/components/UserListItem";
import FollowButton from "@/components/FollowButton";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { feedimAlert } from "@/components/FeedimAlert";
import { useTranslations } from "next-intl";
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
  bio?: string;
  follower_count?: number;
  mutual_count?: number;
  follows_me?: boolean;
}

const MAX_SUGGESTIONS = 20;
const REFRESH_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export default function SuggestionsPage() {
  const t = useTranslations("explore");
  const tProfile = useTranslations("profile");
  useSearchParams();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const [pendingFollows, setPendingFollows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const viewerScope = currentUser?.id ? `user:${currentUser.id}` : "guest";
  const getSuggestionsUrl = useCallback((pageNum: number) => (
    withCacheScope(`/api/suggestions?page=${pageNum}&limit=10`, viewerScope)
  ), [viewerScope]);

  // Refresh cooldown: check if last refresh was within the cooldown period
  useEffect(() => {
    try {
      const lastRefresh = Number(sessionStorage.getItem("fdm-suggestions-refresh") || "0");
      if (lastRefresh && Date.now() - lastRefresh < REFRESH_COOLDOWN_MS) {
        setRefreshCooldown(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    init();
  }, [currentUser?.id]);

  useLayoutEffect(() => {
    if (!currentUser?.id) return;
    const cached = readCache(getSuggestionsUrl(1)) as { users?: SuggestedUser[]; hasMore?: boolean } | null;
    if (cached?.users) {
      const limited = cached.users.slice(0, MAX_SUGGESTIONS);
      setUsers(limited);
      setHasMore((cached.hasMore || false) && limited.length < MAX_SUGGESTIONS);
      setLoading(false);
    }
  }, [currentUser?.id, getSuggestionsUrl]);

  const init = async () => {
    const { data: { user } } = currentUser
      ? { data: { user: currentUser } }
      : await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Get current follows
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    setFollowing(new Set((follows || []).map(f => f.following_id)));

    await loadSuggestions();
  };

  const loadSuggestions = useCallback(async (pageNum = 1, forceRefresh = false) => {
    const url = getSuggestionsUrl(pageNum);
    if (pageNum === 1) {
    }
    try {
      const data = await fetchWithCache(url, { ttlSeconds: 3600, forceRefresh: forceRefresh || pageNum > 1 }) as {
        users?: SuggestedUser[];
        hasMore?: boolean;
      };
      if (pageNum === 1) {
        const limited = (data.users || []).slice(0, MAX_SUGGESTIONS);
        setUsers(limited);
        setHasMore((data.hasMore || false) && limited.length < MAX_SUGGESTIONS);
      } else {
        setUsers(prev => {
          const existingIds = new Set(prev.map(u => u.user_id));
          const newUsers = (data.users || []).filter((u: SuggestedUser) => !existingIds.has(u.user_id));
          const merged = [...prev, ...newUsers].slice(0, MAX_SUGGESTIONS);
          // Disable pagination if we've reached the cap
          if (merged.length >= MAX_SUGGESTIONS) setHasMore(false);
          else setHasMore(data.hasMore || false);
          return merged;
        });
      }
      setPage(pageNum);
    } catch {
      // Silent
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [getSuggestionsUrl]);

  const handleRefresh = async () => {
    if (refreshing || refreshCooldown) return;
    setRefreshing(true);
    try {
      sessionStorage.setItem("fdm-suggestions-refresh", String(Date.now()));
    } catch {}
    setRefreshCooldown(true);
    await loadSuggestions(1, true);
  };

  const doFollow = async (username: string, userId: string) => {
    if (pendingFollows.has(userId)) return;
    const prevFollowing = new Set(following);
    const prevRequested = new Set(requested);
    setPendingFollows(prev => new Set(prev).add(userId));
    setFollowing(prev => {
      const updated = new Set(prev);
      updated.add(userId);
      return updated;
    });
    setRequested(prev => {
      const updated = new Set(prev);
      updated.delete(userId);
      return updated;
    });

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || tProfile("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(prev => {
        const updated = new Set(prev);
        if (data.following) updated.add(userId); else updated.delete(userId);
        return updated;
      });
      setRequested(prev => {
        const updated = new Set(prev);
        if (data.requested) updated.add(userId); else updated.delete(userId);
        return updated;
      });
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPendingFollows(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const doUnfollow = async (username: string, userId: string) => {
    if (pendingFollows.has(userId)) return;
    const prevFollowing = new Set(following);
    const prevRequested = new Set(requested);
    // Optimistic update for instant feedback
    setFollowing(prev => {
      const updated = new Set(prev);
      updated.delete(userId);
      return updated;
    });
    setRequested(prev => {
      const updated = new Set(prev);
      updated.delete(userId);
      return updated;
    });
    setPendingFollows(prev => new Set(prev).add(userId));

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || tProfile("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(prev => {
        const updated = new Set(prev);
        if (data.following) updated.add(userId); else updated.delete(userId);
        return updated;
      });
      setRequested(prev => {
        const updated = new Set(prev);
        if (data.requested) updated.add(userId); else updated.delete(userId);
        return updated;
      });
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPendingFollows(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleFollow = (username: string, userId: string) => {
    if (following.has(userId) || requested.has(userId)) {
      feedimAlert("question", tProfile("unfollowConfirm"), { showYesNo: true, onYes: () => { void doUnfollow(username, userId); } });
      return;
    }
    void doFollow(username, userId);
  };

  const refreshButton = (
    <button
      onClick={handleRefresh}
      disabled={refreshing || refreshCooldown}
      className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary disabled:opacity-40"
      title={t("refresh")}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={refreshing ? "animate-spin" : ""}
      >
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </svg>
    </button>
  );

  return (
    <AppLayout hideRightSidebar headerTitle={t("findPeople")} headerRightAction={refreshButton}>
      <div className="px-1.5 py-4">
        {loading ? (
          <div className="space-y-0 px-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="h-[40px] w-[40px] rounded-full bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-24 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-16 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
                <div className="h-[30px] w-[72px] bg-bg-secondary rounded-lg shrink-0 animate-pulse" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-lg font-bold mb-2">{t("noSuggestionsFound")}</h2>
            <p className="text-[0.84rem] text-text-muted">{t("suggestionsWillImprove")}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map(u => (
              <UserListItem
                key={u.user_id}
                user={u}
                size="lg"
                autoSubtitle
                action={
                  <FollowButton
                    following={following.has(u.user_id) || requested.has(u.user_id)}
                    isPrivate={requested.has(u.user_id)}
                    followsMe={u.follows_me && !following.has(u.user_id)}
                    onClick={() => handleFollow(u.username, u.user_id)}
                    disabled={pendingFollows.has(u.user_id)}
                  />
                }
              />
            ))}
            <LoadMoreTrigger
              onLoadMore={async () => {
                if (users.length >= MAX_SUGGESTIONS) return;
                const user = await requireAuth();
                if (!user) return;
                setLoadingMore(true);
                loadSuggestions(page + 1);
              }}
              loading={loadingMore}
              hasMore={hasMore && users.length < MAX_SUGGESTIONS}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
