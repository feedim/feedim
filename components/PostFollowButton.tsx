"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import FollowButton from "@/components/FollowButton";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";

interface PostFollowButtonProps {
  authorUsername: string;
  authorUserId: string;
}

export default function PostFollowButton({ authorUsername, authorUserId }: PostFollowButtonProps) {
  const t = useTranslations("follow");
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [ready, setReady] = useState(false);
  const { user: ctxUser, isLoggedIn } = useUser();
  const { requireAuth } = useAuthModal();

  const isOwn = ctxUser?.id === authorUserId;

  useEffect(() => {
    if (!isLoggedIn || !ctxUser || isOwn) { setReady(true); return; }

    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.from("follows").select("id").eq("follower_id", ctxUser.id).eq("following_id", authorUserId).maybeSingle(),
      supabase.from("follow_requests").select("id").eq("requester_id", ctxUser.id).eq("target_id", authorUserId).eq("status", "pending").maybeSingle(),
      supabase.from("follows").select("id").eq("follower_id", authorUserId).eq("following_id", ctxUser.id).maybeSingle(),
    ]).then(([followRes, reqRes, followsMeRes]) => {
      if (cancelled) return;
      setFollowing(!!followRes.data);
      setRequested(!!reqRes.data);
      setFollowsMe(!!followsMeRes.data);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [authorUserId, ctxUser, isLoggedIn, isOwn]);

  const doFollow = async () => {
    // Follow — optimistic update
    setFollowing(true);
    try {
      const res = await fetch(`/api/users/${authorUsername}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(false);
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(data.following);
      setRequested(data.requested);
    } catch {
      setFollowing(false);
    }
  };

  const doUnfollow = async () => {
    // Unfollow — wait for API before updating state (alert shows loader)
    try {
      const res = await fetch(`/api/users/${authorUsername}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(data.following);
      setRequested(data.requested);
    } catch {
      // Keep current state on error
    }
  };

  const handleFollow = async () => {
    if (!ctxUser) { const user = await requireAuth(); if (!user) return; }

    if (following || requested) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: doUnfollow });
      return;
    }
    doFollow();
  };

  if (isOwn || !ready) return null;

  return <FollowButton following={following || requested} isPrivate={requested} followsMe={followsMe && !following} onClick={handleFollow} />;
}
