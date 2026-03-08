"use client";

import { useState, useEffect, useLayoutEffect, useCallback, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import FollowButton from "@/components/FollowButton";
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
  follows_me?: boolean;
}

interface Props {
  userId: string;
  username: string;
  onClose: () => void;
  visible?: boolean;
}

export default function SimilarAccountsCarousel({ userId, username, onClose, visible = true }: Props) {
  const t = useTranslations("follow");
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const requestUrl = withCacheScope(`/api/suggestions/similar?user_id=${userId}&limit=8`, currentUser?.id ? `user:${currentUser.id}` : "guest");

  useLayoutEffect(() => {
    if (!visible) return;
    const cached = readCache(requestUrl) as { users?: SuggestedUser[] } | null;
    if (cached?.users) {
      setUsers(cached.users.filter((u) => u.user_id !== userId));
      setLoaded(true);
    }
  }, [requestUrl, userId, visible]);

  const prevUserIdRef = useRef(userId);
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      fetchedRef.current = false;
      setLoaded(false);
      setUsers([]);
      prevUserIdRef.current = userId;
    }
    if (!visible || fetchedRef.current) return;
    fetchedRef.current = true;
    fetchWithCache(requestUrl, { ttlSeconds: 300 })
      .then((data) => {
        const payload = data as { users?: SuggestedUser[] };
        setUsers((payload.users || []).filter((u: SuggestedUser) => u.user_id !== userId));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [requestUrl, userId, visible]);

  const doFollowToggle = useCallback(async (uname: string, uid: string) => {
    if (pending.has(uid)) return;
    const wasFollowing = following.has(uid);
    setPending(prev => new Set(prev).add(uid));
    setFollowing(prev => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(uid);
      else next.add(uid);
      return next;
    });

    try {
      const res = await fetch(`/api/users/${uname}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prev => {
          const reverted = new Set(prev);
          if (wasFollowing) reverted.add(uid);
          else reverted.delete(uid);
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
        if (wasFollowing) reverted.add(uid);
        else reverted.delete(uid);
        return reverted;
      });
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
    }
  }, [following, pending, t]);

  const handleFollow = useCallback(async (uname: string, uid: string) => {
    const user = await requireAuth();
    if (!user) return;

    if (following.has(uid)) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => { void doFollowToggle(uname, uid); } });
      return;
    }
    void doFollowToggle(uname, uid);
  }, [following, doFollowToggle, requireAuth]);

  if (!loaded) {
    return (
      <div className="mx-1 sm:mx-3 my-3 py-3 bg-bg-secondary rounded-[16px] select-none">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="h-[14px] w-40 bg-bg-tertiary rounded-[5px] animate-pulse" />
          <div className="w-7 h-7 rounded-full bg-bg-tertiary animate-pulse" />
        </div>
        <div className="flex gap-2.5 overflow-hidden" style={{ marginLeft: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex flex-col items-center shrink-0 w-[130px] py-3 px-1.5 bg-bg-secondary rounded-[14px] border border-border-primary">
              <div className="w-[72px] h-[72px] rounded-full bg-bg-tertiary animate-pulse mb-2" />
              <div className="h-[11px] w-16 bg-bg-tertiary rounded-[5px] animate-pulse mb-1" />
              <div className="h-[9px] w-12 bg-bg-tertiary rounded-[5px] animate-pulse" />
              <div className="mt-2 w-full h-[31px] bg-bg-tertiary rounded-lg animate-pulse" />
            </div>
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
        <span className="text-[0.88rem] font-bold">{t("similarAccountsDesc", { username })}</span>
        <button
          onClick={onClose}
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
              className="flex flex-col items-center shrink-0 w-[130px] py-3 px-1.5 bg-bg-secondary rounded-[14px] border border-border-primary"
              style={{ scrollSnapAlign: "start" }}
            >
              <Link href={`/u/${u.username}`}>
                {u.avatar_url ? (
                  <img
                    data-src={u.avatar_url}
                    alt=""
                    decoding="async"
                    className="lazyload w-[72px] h-[72px] rounded-full object-cover mb-2 bg-bg-tertiary border border-border-primary"
                  />
                ) : (
                  <img
                    className="default-avatar-auto bg-bg-tertiary w-[72px] h-[72px] rounded-full object-cover mb-2 border border-border-primary"
                    alt=""
                  />
                )}
              </Link>
              <Link href={`/u/${u.username}`} className="text-center w-full my-[2px]">
                <div className="space-y-0.5">
                  <p className="text-[0.79rem] font-semibold truncate leading-tight">{displayName}</p>
                  <p className="text-[0.68rem] text-text-muted truncate leading-tight">@{u.username}</p>
                </div>
              </Link>
              <FollowButton
                following={isFollowing}
                followsMe={u.follows_me && !isFollowing}
                onClick={() => { void handleFollow(u.username, u.user_id); }}
                disabled={pending.has(u.user_id)}
                className="mt-2 w-full !h-[28px] !text-[0.7rem] !rounded-lg"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
