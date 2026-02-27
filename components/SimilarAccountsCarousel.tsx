"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import { feedimAlert } from "@/components/FeedimAlert";

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
}

export default function SimilarAccountsCarousel({ userId, username, onClose }: Props) {
  const t = useTranslations("follow");
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/suggestions/similar?user_id=${userId}&limit=8`)
      .then(r => r.json())
      .then(data => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [userId]);

  const doFollowToggle = useCallback(async (uname: string, uid: string) => {
    const wasFollowing = following.has(uid);
    const newFollowing = new Set(following);
    if (wasFollowing) {
      newFollowing.delete(uid);
    } else {
      newFollowing.add(uid);
    }
    setFollowing(newFollowing);

    try {
      const res = await fetch(`/api/users/${uname}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        const reverted = new Set(following);
        if (wasFollowing) reverted.add(uid);
        else reverted.delete(uid);
        setFollowing(reverted);
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
      }
    } catch {
      const reverted = new Set(following);
      if (wasFollowing) reverted.add(uid);
      else reverted.delete(uid);
      setFollowing(reverted);
    }
  }, [following]);

  const handleFollow = useCallback((uname: string, uid: string) => {
    if (following.has(uid)) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => doFollowToggle(uname, uid) });
      return;
    }
    doFollowToggle(uname, uid);
  }, [following, doFollowToggle]);

  if (!loaded) {
    return (
      <div className="mx-1 sm:mx-3 my-3 py-6 bg-bg-secondary rounded-[16px] flex justify-center">
        <span className="loader" style={{ width: 22, height: 22 }} />
      </div>
    );
  }

  if (users.length === 0) return null;

  return (
    <div
      className="mx-1 sm:mx-3 my-3 py-3 bg-bg-secondary rounded-[16px]"
      style={{ ["--bg-tertiary" as any]: "var(--bg-secondary)" }}
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
              className="flex flex-col items-center shrink-0 w-[130px] py-3 px-2 bg-bg-secondary rounded-[14px]"
              style={{ scrollSnapAlign: "start" }}
            >
              <Link href={`/u/${u.username}`}>
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-[72px] h-[72px] rounded-full object-cover mb-2 bg-bg-tertiary"
                  />
                ) : (
                  <img
                    className="default-avatar-auto w-[72px] h-[72px] rounded-full object-cover mb-2"
                    alt=""
                  />
                )}
              </Link>
              <Link href={`/u/${u.username}`} className="text-center w-full">
                <p className="text-[0.78rem] font-semibold truncate">{displayName}</p>
                <p className="text-[0.68rem] text-text-muted truncate">@{u.username}</p>
              </Link>
              <FollowButton
                following={isFollowing}
                followsMe={u.follows_me && !isFollowing}
                onClick={() => handleFollow(u.username, u.user_id)}
                className="mt-2 w-full !h-[34px] !text-[0.75rem] !rounded-lg"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
