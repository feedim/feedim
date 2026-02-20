"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/UserContext";
import { useAuthModal } from "@/components/AuthModal";
import FollowButton from "@/components/FollowButton";
import { feedimAlert } from "@/components/FeedimAlert";

interface PostFollowButtonProps {
  authorUsername: string;
  authorUserId: string;
}

export default function PostFollowButton({ authorUsername, authorUserId }: PostFollowButtonProps) {
  const [following, setFollowing] = useState(false);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);
  const { user: ctxUser, isLoggedIn } = useUser();
  const { requireAuth } = useAuthModal();

  const isOwn = ctxUser?.id === authorUserId;

  useEffect(() => {
    if (!isLoggedIn || !ctxUser || isOwn) { setReady(true); return; }

    const supabase = createClient();
    Promise.all([
      supabase.from("follows").select("id").eq("follower_id", ctxUser.id).eq("following_id", authorUserId).single(),
      supabase.from("follow_requests").select("id").eq("requester_id", ctxUser.id).eq("target_id", authorUserId).eq("status", "pending").single(),
    ]).then(([followRes, reqRes]) => {
      setFollowing(!!followRes.data);
      setRequested(!!reqRes.data);
      setReady(true);
    });
  }, [authorUserId, ctxUser, isLoggedIn, isOwn]);

  const doFollow = async () => {
    const wasFollowing = following;
    const wasRequested = requested;

    if (wasFollowing || wasRequested) {
      setFollowing(false);
      setRequested(false);
    } else {
      setFollowing(true);
    }

    try {
      const res = await fetch(`/api/users/${authorUsername}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowing(wasFollowing);
        setRequested(wasRequested);
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || "Günlük takip limitine ulaştın.");
        }
        return;
      }
      const data = await res.json();
      setFollowing(data.following);
      setRequested(data.requested);
    } catch {
      setFollowing(wasFollowing);
      setRequested(wasRequested);
    }
  };

  const handleFollow = async () => {
    const user = await requireAuth();
    if (!user) return;

    if (following || requested) {
      feedimAlert("question", "Takibi bırakmak istiyor musunuz?", { showYesNo: true, onYes: doFollow });
      return;
    }
    doFollow();
  };

  if (isOwn || !ready) return null;

  return <FollowButton following={following || requested} isPrivate={requested} onClick={handleFollow} />;
}
