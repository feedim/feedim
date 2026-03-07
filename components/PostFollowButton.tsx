"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import FollowButton from "@/components/FollowButton";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";

interface PostFollowButtonProps {
  authorUsername: string;
  authorUserId: string;
  /** Pre-fetched from server to prevent flash */
  initialFollowing?: boolean;
  initialRequested?: boolean;
  initialFollowsMe?: boolean;
  followStateResolved?: boolean;
}

export default function PostFollowButton({
  authorUsername,
  authorUserId,
  initialFollowing = false,
  initialRequested = false,
  initialFollowsMe = false,
  followStateResolved = false,
}: PostFollowButtonProps) {
  const t = useTranslations("follow");
  const { user: ctxUser, isLoggedIn } = useUser();
  const [following, setFollowing] = useState(initialFollowing);
  const [requested, setRequested] = useState(initialRequested);
  const [followsMe, setFollowsMe] = useState(initialFollowsMe);
  const [statusResolved, setStatusResolved] = useState(followStateResolved);
  const [pending, setPending] = useState(false);
  const { requireAuth } = useAuthModal();
  const hasFetched = useRef(false);

  const isOwn = ctxUser?.id === authorUserId;

  useEffect(() => {
    if (followStateResolved || !isLoggedIn || !ctxUser || isOwn) {
      setStatusResolved(true);
    }
  }, [followStateResolved, isLoggedIn, ctxUser, isOwn]);

  // Only fetch from client if no server props were passed (fallback for non-server pages)
  useEffect(() => {
    if (hasFetched.current) return;
    if (!isLoggedIn || !ctxUser || isOwn) return;
    if (followStateResolved) return;

    hasFetched.current = true;
    const supabase = createClient();
    Promise.all([
      supabase.from("follows").select("id").eq("follower_id", ctxUser.id).eq("following_id", authorUserId).maybeSingle(),
      supabase.from("follow_requests").select("id").eq("requester_id", ctxUser.id).eq("target_id", authorUserId).eq("status", "pending").maybeSingle(),
      supabase.from("follows").select("id").eq("follower_id", authorUserId).eq("following_id", ctxUser.id).maybeSingle(),
    ]).then(([followRes, reqRes, followsMeRes]) => {
      setFollowing(!!followRes.data);
      setRequested(!!reqRes.data);
      setFollowsMe(!!followsMeRes.data);
      setStatusResolved(true);
    }).catch(() => {
      setStatusResolved(true);
    });
  }, [authorUserId, ctxUser, isLoggedIn, isOwn, followStateResolved]);

  const doFollow = async () => {
    if (pending) return;
    const prevFollowing = following;
    const prevRequested = requested;
    setPending(true);
    setFollowing(true);
    setRequested(false);
    try {
      const res = await fetch(`/api/users/${authorUsername}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(data.following);
      setRequested(data.requested);
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPending(false);
    }
  };

  const doUnfollow = async () => {
    if (pending) return;
    const prevFollowing = following;
    const prevRequested = requested;
    setPending(true);
    setFollowing(false);
    setRequested(false);
    try {
      const res = await fetch(`/api/users/${authorUsername}/follow`, { method: "POST", keepalive: true });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("followLimitReached"));
        }
        return;
      }
      const data = await res.json();
      setFollowing(data.following);
      setRequested(data.requested);
    } catch {
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPending(false);
    }
  };

  const handleFollow = async () => {
    if (!ctxUser) { const user = await requireAuth(); if (!user) return; }

    if (following || requested) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => { void doUnfollow(); } });
      return;
    }
    void doFollow();
  };

  if (isOwn) return null;
  if (!statusResolved) return null;

  return <FollowButton following={following || requested} isPrivate={requested} followsMe={followsMe && !following} onClick={handleFollow} disabled={pending} />;
}
