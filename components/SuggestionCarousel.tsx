"use client";

import { useState, useEffect, useLayoutEffect, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X, ChevronRight } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import LazyAvatar from "@/components/LazyAvatar";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { feedimAlert } from "@/components/FeedimAlert";
import { useAuthModal } from "@/components/AuthModal";
import { useUser } from "@/components/UserContext";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";

interface SuggestedUser {
  user_id: string;
  username: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
  follows_me?: boolean;
}

interface Props {
  excludeUserId?: string;
}

const DISMISS_KEY = "fdm-carousel-dismissed";

export default function SuggestionCarousel({ excludeUserId }: Props = {}) {
  const t = useTranslations("follow");
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const requestUrl = withCacheScope(`/api/suggestions?limit=8${excludeUserId ? `&exclude=${excludeUserId}` : ""}`, currentUser?.id ? `user:${currentUser.id}` : "guest");

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }
    const cached = readCache(requestUrl) as { users?: SuggestedUser[] } | null;
    if (cached?.users) {
      setUsers(cached.users.filter((u) => u.user_id !== excludeUserId));
      setLoaded(true);
    }
  }, [excludeUserId, requestUrl]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await fetchWithCache(requestUrl, { ttlSeconds: 300 }) as { users?: SuggestedUser[] };
      const filtered = (data.users || []).filter((u: SuggestedUser) => u.user_id !== excludeUserId);
      setUsers(filtered);
    } catch {
      // Silent
    } finally {
      setLoaded(true);
    }
  }, [excludeUserId, requestUrl]);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISS_KEY)) {
      setDismissed(true);
      return;
    }
    void loadUsers();
  }, [loadUsers]);

  const doFollowToggle = useCallback(async (username: string, userId: string) => {
    if (pending.has(userId)) return;
    const wasFollowing = following.has(userId);
    setPending(prev => new Set(prev).add(userId));
    setFollowing(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(userId);
      else next.add(userId);
      return next;
    });

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prev => {
          const reverted = new Set(prev);
          if (wasFollowing) reverted.add(userId);
          else reverted.delete(userId);
          return reverted;
        });
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
      }
    } catch {
      setFollowing(prev => {
        const reverted = new Set(prev);
        if (wasFollowing) reverted.add(userId);
        else reverted.delete(userId);
        return reverted;
      });
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [following, pending, t]);

  const handleFollow = useCallback(async (username: string, userId: string) => {
    const user = await requireAuth();
    if (!user) return;

    if (following.has(userId)) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => { void doFollowToggle(username, userId); } });
      return;
    }
    void doFollowToggle(username, userId);
  }, [following, doFollowToggle, requireAuth]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem(DISMISS_KEY, "1");
  }, []);

  if (dismissed) return null;

  if (!loaded) {
    return (
      <div className="mx-1 sm:mx-3 my-3 py-3 bg-bg-secondary rounded-[16px] select-none">
        <div className="flex items-center justify-between px-4 mb-3">
          <span className="text-[0.88rem] font-bold">{t("peopleYouMayKnow")}</span>
          <button onClick={handleDismiss} className="i-btn !w-7 !h-7 text-text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-2.5 overflow-hidden px-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="shrink-0 w-[130px] h-[180px] rounded-[14px] bg-bg-tertiary animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div
      className="mx-1 sm:mx-3 my-3 py-3 bg-bg-secondary rounded-[16px] select-none"
      style={{ ["--bg-tertiary" as const]: "var(--bg-secondary)" } as CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <span className="text-[0.88rem] font-bold">{t("peopleYouMayKnow")}</span>
        <button
          onClick={handleDismiss}
          className="i-btn !w-7 !h-7 text-text-muted"
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
              className="flex flex-col items-center shrink-0 w-[130px] py-3 px-1.5 bg-bg-secondary rounded-[14px] border border-border-primary"
              style={{ scrollSnapAlign: "start" }}
            >
              <Link href={`/u/${u.username}`}>
                <LazyAvatar src={u.avatar_url} alt={u.username} sizeClass="w-[72px] h-[72px]" className="mb-2" />
              </Link>
              <Link href={`/u/${u.username}`} className="text-center w-full my-[2px]">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-center gap-0.5">
                    <p className="text-[0.82rem] font-semibold truncate leading-tight">{displayName}</p>
                    {u.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(u.premium_plan)} role={u.role} />}
                  </div>
                  <p className="text-[0.7rem] text-text-muted truncate leading-tight">@{u.username}</p>
                </div>
              </Link>
              <FollowButton
                following={isFollowing}
                followsMe={u.follows_me && !isFollowing}
                onClick={() => { void handleFollow(u.username, u.user_id); }}
                disabled={pending.has(u.user_id)}
                className="mt-2 w-full !h-[31px] !text-[0.7rem] !rounded-lg"
              />
            </div>
          );
        })}

        {/* "See all" card */}
        <Link
          href="/suggestions"
          className="flex flex-col items-center justify-center shrink-0 w-[100px] py-3 px-2 bg-bg-secondary rounded-[14px] hover:bg-bg-secondary transition"
          style={{ scrollSnapAlign: "start" }}
        >
          <div className="w-[72px] h-[72px] rounded-full bg-bg-secondary flex items-center justify-center mb-2">
            <ChevronRight className="h-6 w-6 text-text-muted" />
          </div>
          <p className="text-[0.78rem] font-semibold text-text-muted">{t("seeAll")}</p>
        </Link>
      </div>
    </div>
  );
}
