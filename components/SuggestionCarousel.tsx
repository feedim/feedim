"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { X, UserPlus, Check, ChevronRight } from "lucide-react";
import { feedimAlert } from "@/components/FeedimAlert";

interface SuggestedUser {
  user_id: string;
  username: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
}

const DISMISS_KEY = "fdm-carousel-dismissed";

export default function SuggestionCarousel() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/suggestions?limit=8");
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // Silent
    } finally {
      setLoaded(true);
    }
  }, []);

  const doFollowToggle = useCallback(async (username: string, userId: string) => {
    const wasFollowing = following.has(userId);
    const newFollowing = new Set(following);
    if (wasFollowing) {
      newFollowing.delete(userId);
    } else {
      newFollowing.add(userId);
    }
    setFollowing(newFollowing);

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        const reverted = new Set(following);
        if (wasFollowing) reverted.add(userId);
        else reverted.delete(userId);
        setFollowing(reverted);
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || "Günlük takip limitine ulaştın.");
        }
      }
    } catch {
      const reverted = new Set(following);
      if (wasFollowing) reverted.add(userId);
      else reverted.delete(userId);
      setFollowing(reverted);
    }
  }, [following]);

  const handleFollow = useCallback((username: string, userId: string) => {
    if (following.has(userId)) {
      feedimAlert("question", "Takibi bırakmak istiyor musunuz?", { showYesNo: true, onYes: () => doFollowToggle(username, userId) });
      return;
    }
    doFollowToggle(username, userId);
  }, [following, doFollowToggle]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }, []);

  if (dismissed || !loaded || users.length === 0) return null;

  return (
    <div className="mx-1 sm:mx-3 my-3 py-3 bg-bg-secondary rounded-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-[0.88rem] font-bold">Tanıyor olabileceğin kişiler</span>
        <button
          onClick={handleDismiss}
          className="i-btn !w-7 !h-7 text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Horizontal scroll */}
      <div
        className="flex gap-2.5 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: "x mandatory", marginLeft: 10 }}
      >
        {users.map((u) => {
          const isFollowing = following.has(u.user_id);
          const displayName = u.full_name || u.name || u.username;
          return (
            <div
              key={u.user_id}
              className="flex flex-col items-center shrink-0 w-[130px] py-3 px-2 bg-bg-secondary rounded-[14px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <Link href={`/u/${u.username}`}>
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    className="w-[72px] h-[72px] rounded-full object-cover mb-2"
                    loading="lazy"
                  />
                ) : (
                  <img
                    className="default-avatar-auto w-[72px] h-[72px] rounded-full object-cover mb-2"
                    alt=""
                    loading="lazy"
                  />
                )}
              </Link>
              <Link href={`/u/${u.username}`} className="text-center w-full">
                <p className="text-[0.78rem] font-semibold truncate">{displayName}</p>
                <p className="text-[0.68rem] text-text-muted truncate">@{u.username}</p>
              </Link>
              <button
                onClick={() => handleFollow(u.username, u.user_id)}
                className={`mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[0.75rem] font-semibold transition ${
                  isFollowing
                    ? "bg-bg-secondary text-text-primary"
                    : "bg-accent-main text-white"
                }`}
              >
                {isFollowing ? (
                  <><Check className="h-3 w-3" /> Takip</>
                ) : (
                  <><UserPlus className="h-3 w-3" /> Takip Et</>
                )}
              </button>
            </div>
          );
        })}

        {/* "See all" card */}
        <Link
          href="/dashboard/suggestions"
          className="flex flex-col items-center justify-center shrink-0 w-[100px] py-3 px-2 bg-bg-secondary rounded-[14px] hover:bg-bg-secondary transition"
          style={{ scrollSnapAlign: "start" }}
        >
          <div className="w-[72px] h-[72px] rounded-full bg-bg-secondary flex items-center justify-center mb-2">
            <ChevronRight className="h-6 w-6 text-text-muted" />
          </div>
          <p className="text-[0.78rem] font-semibold text-text-muted">Tümünü gör</p>
        </Link>
      </div>
    </div>
  );
}
