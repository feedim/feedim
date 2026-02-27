"use client";

import { useEffect, useState, useCallback } from "react";
import {useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AppLayout from "@/components/AppLayout";
import UserListItem from "@/components/UserListItem";
import FollowButton from "@/components/FollowButton";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { feedimAlert } from "@/components/FeedimAlert";
import { useTranslations } from "next-intl";

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

const FOLLOW_COOLDOWN = 3000;

export default function SuggestionsPage() {
  const t = useTranslations("explore");
  const tProfile = useTranslations("profile");
  useSearchParams();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [disabledFollows, setDisabledFollows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Get current follows
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    setFollowing(new Set((follows || []).map(f => f.following_id)));

    await loadSuggestions();
  };

  const loadSuggestions = useCallback(async (pageNum = 1) => {
    try {
      const res = await fetch(`/api/suggestions?page=${pageNum}&limit=10`);
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
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadSuggestions();
  };

  const doFollowToggle = async (username: string, userId: string) => {
    if (disabledFollows.has(userId)) return;

    const wasFollowing = following.has(userId);
    const wasRequested = requested.has(userId);
    const newFollowing = new Set(following);
    const newRequested = new Set(requested);

    if (wasFollowing || wasRequested) {
      newFollowing.delete(userId);
      newRequested.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowing(newFollowing);
    setRequested(newRequested);

    setDisabledFollows(prev => new Set(prev).add(userId));
    setTimeout(() => {
      setDisabledFollows(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }, FOLLOW_COOLDOWN);

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowing(prev => {
          const reverted = new Set(prev);
          if (wasFollowing) reverted.add(userId); else reverted.delete(userId);
          return reverted;
        });
        setRequested(prev => {
          const reverted = new Set(prev);
          if (wasRequested) reverted.add(userId); else reverted.delete(userId);
          return reverted;
        });
      } else {
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
      }
    } catch {
      setFollowing(prev => {
        const reverted = new Set(prev);
        if (wasFollowing) reverted.add(userId); else reverted.delete(userId);
        return reverted;
      });
      setRequested(prev => {
        const reverted = new Set(prev);
        if (wasRequested) reverted.add(userId); else reverted.delete(userId);
        return reverted;
      });
    }
  };

  const handleFollow = (username: string, userId: string) => {
    if (following.has(userId) || requested.has(userId)) {
      feedimAlert("question", tProfile("unfollowConfirm"), { showYesNo: true, onYes: () => doFollowToggle(username, userId) });
      return;
    }
    doFollowToggle(username, userId);
  };

  const refreshButton = (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
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
      <div className="px-2 py-4">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 text-text-muted mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">{t("noSuggestionsFound")}</h2>
            <p className="text-sm text-text-muted">{t("suggestionsWillImprove")}</p>
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
                    disabled={disabledFollows.has(u.user_id)}
                  />
                }
              />
            ))}
            <LoadMoreTrigger
              onLoadMore={() => { setLoadingMore(true); loadSuggestions(page + 1); }}
              loading={loadingMore}
              hasMore={hasMore}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
