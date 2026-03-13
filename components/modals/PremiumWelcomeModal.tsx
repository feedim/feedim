"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import Link from "next/link";
import Modal from "./Modal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import UserListItem from "@/components/UserListItem";
import FollowButton from "@/components/FollowButton";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import LazyAvatar from "@/components/LazyAvatar";

interface PremiumWelcomeModalProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  planId: string;
  avatarUrl?: string | null;
  fullName?: string;
}

interface SuggestedUser {
  user_id: string;
  username: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  bio?: string;
  follows_me?: boolean;
}

const planPerkKeys: Record<string, string[]> = {
  basic: ["noAdsExperience", "increasedLimits", "twoFactorAuth"],
  pro: ["verifiedBadge", "noAdsExperience", "monetization", "analyticsPanel", "featuredComments"],
  max: ["goldenBadge", "noAdsExperience", "monetization", "profileVisitorsFeature", "longPostsComments", "prioritySupport"],
  business: ["goldenBadge", "businessAccount", "monetization", "allPremiumFeatures", "prioritySupport"],
};

export default function PremiumWelcomeModal({ open, onClose, planName, planId, avatarUrl, fullName }: PremiumWelcomeModalProps) {
  const t = useTranslations("modals");
  const perkKeys = planPerkKeys[planId] || planPerkKeys.pro;
  const badgeVariant = getBadgeVariant(planId);

  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    loadSuggestions();
  }, [open]);

  const loadSuggestions = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: follows }, { data: blocks }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("blocks").select("blocked_id, blocker_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
      ]);

      const followingIds = (follows || []).map((f: any) => f.following_id);
      setFollowing(new Set(followingIds));

      const blockedIds = (blocks || []).map((b: any) => b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
      const excludeIds = new Set([user.id, ...followingIds, ...blockedIds]);

      const { data: suggested } = await supabase
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, bio")
        .neq("user_id", user.id)
        .order("follower_count", { ascending: false })
        .limit(10);

      setUsers((suggested || []).filter((u: any) => !excludeIds.has(u.user_id)).slice(0, 3));
    } catch {
      // Silent
    }
  };

  const doFollow = async (username: string, userId: string) => {
    if (pending.has(userId)) return;
    const prevFollowing = new Set(following);
    const prevRequested = new Set(requested);
    setPending(prev => new Set(prev).add(userId));
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
        if (res.status === 403 || res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error);
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
      setPending(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  const doUnfollow = async (username: string, userId: string) => {
    if (pending.has(userId)) return;
    // Optimistic update for instant feedback
    const prevFollowing = new Set(following);
    const prevRequested = new Set(requested);
    setPending(prev => new Set(prev).add(userId));
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

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        setFollowing(prevFollowing);
        setRequested(prevRequested);
        if (res.status === 403 || res.status === 429) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error);
        }
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
      setFollowing(prevFollowing);
      setRequested(prevRequested);
    } finally {
      setPending(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    }
  };

  const handleFollow = (username: string, userId: string) => {
    if (following.has(userId) || requested.has(userId)) {
      feedimAlert("question", t("unfollowConfirm"), { showYesNo: true, onYes: () => { void doUnfollow(username, userId); } });
      return;
    }
    void doFollow(username, userId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      centerOnDesktop
      title={t("premiumTitle")}
      infoText={t("premiumInfoText")}
      footer={
        <div className="px-6 py-4 border-t border-border-primary">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-full bg-accent-main text-white font-semibold text-[0.95rem] hover:opacity-90 transition-all active:scale-[0.97]"
          >
            {t("startExploring")}
          </button>
        </div>
      }
    >
      <div className="px-6 pt-8 pb-5 text-center">
        {/* Avatar + Badge */}
        <div className="relative inline-block mb-5">
          <LazyAvatar src={avatarUrl} alt="" sizeClass="w-[82px] h-[82px]" borderClass="ring-4 ring-bg-secondary" />
          <div className="absolute -bottom-1 -right-1">
            <VerifiedBadge size="lg" variant={badgeVariant} className="!h-[28px] !w-[28px] !min-w-[28px] drop-shadow-md" />
          </div>
        </div>

        {/* Welcome text */}
        <h2 className="text-[1.35rem] font-extrabold mb-1.5">
          {t("welcomeToPremium", { plan: planName })}
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {fullName ? t("premiumGreeting", { name: fullName }) : t("premiumGreetingShort")}
        </p>

        {/* Perks */}
        <div className="text-left space-y-3 mb-6">
          {perkKeys.map((key, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-accent-main" strokeWidth={3} />
              </div>
              <span className="text-[0.88rem] font-medium">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestion Widget */}
      {users.length > 0 && (
        <div className="mx-4 mb-5 bg-bg-tertiary rounded-[10px] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[0.95rem] font-bold">{t("findPeople")}</span>
            <Link href="/suggestions" onClick={onClose} className="text-[0.75rem] font-medium text-text-muted hover:text-text-primary transition hover:underline">
              {t("seeAll")}
            </Link>
          </div>
          <div className="space-y-0">
            {users.map((u) => (
              <UserListItem
                key={u.user_id}
                user={u}
                autoSubtitle
                onNavigate={onClose}
                action={
                  <FollowButton following={following.has(u.user_id) || requested.has(u.user_id)} isPrivate={requested.has(u.user_id)} followsMe={u.follows_me && !following.has(u.user_id)} onClick={() => handleFollow(u.username, u.user_id)} disabled={pending.has(u.user_id)} />
                }
              />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
