"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import Link from "next/link";
import Modal from "./Modal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import UserListItem from "@/components/UserListItem";
import FollowButton from "@/components/FollowButton";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";

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
}

const planPerks: Record<string, string[]> = {
  basic: [
    "Reklamsız deneyim",
    "Artırılmış günlük limitler",
  ],
  pro: [
    "Onaylı rozet",
    "Reklamsız deneyim",
    "Para kazanma",
    "Keşfette öne çıkma",
    "Analitik paneli",
  ],
  max: [
    "Onaylı rozet (altın)",
    "Reklamsız deneyim",
    "Para kazanma",
    "Profil ziyaretçileri",
    "Uzun gönderi & yorum",
    "Öncelikli destek",
  ],
  business: [
    "Onaylı rozet (altın)",
    "İşletme hesabı",
    "Para kazanma",
    "Tüm premium özellikler",
    "Öncelikli destek",
  ],
};

/** Turkish vowel harmony for dative suffix */
function getDativeSuffix(planId: string): string {
  switch (planId) {
    case "basic": return "Basic'e";
    case "pro": return "Pro'ya";
    case "max": return "Max'e";
    case "business": return "Business'a";
    default: return planId + "'e";
  }
}

export default function PremiumWelcomeModal({ open, onClose, planName, planId, avatarUrl, fullName }: PremiumWelcomeModalProps) {
  const perks = planPerks[planId] || planPerks.pro;
  const badgeVariant = getBadgeVariant(planId);

  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [requested, setRequested] = useState<Set<string>>(new Set());

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

      const followingIds = (follows || []).map(f => f.following_id);
      setFollowing(new Set(followingIds));

      const blockedIds = (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
      const excludeIds = new Set([user.id, ...followingIds, ...blockedIds]);

      const { data: suggested } = await supabase
        .from("profiles")
        .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, bio")
        .neq("user_id", user.id)
        .order("follower_count", { ascending: false })
        .limit(10);

      setUsers((suggested || []).filter(u => !excludeIds.has(u.user_id)).slice(0, 3));
    } catch {
      // Silent
    }
  };

  const doFollowToggle = async (username: string, userId: string) => {
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

    try {
      const res = await fetch(`/api/users/${username}/follow`, { method: "POST" });
      if (!res.ok) {
        const reverted = new Set(following);
        const revertedReq = new Set(requested);
        if (wasFollowing) reverted.add(userId); else reverted.delete(userId);
        if (wasRequested) revertedReq.add(userId); else revertedReq.delete(userId);
        setFollowing(reverted);
        setRequested(revertedReq);
      } else {
        const data = await res.json();
        const updated = new Set(following);
        const updatedReq = new Set(requested);
        if (data.following) updated.add(userId); else updated.delete(userId);
        if (data.requested) updatedReq.add(userId); else updatedReq.delete(userId);
        setFollowing(updated);
        setRequested(updatedReq);
      }
    } catch {
      const reverted = new Set(following);
      const revertedReq = new Set(requested);
      if (wasFollowing) reverted.add(userId); else reverted.delete(userId);
      if (wasRequested) revertedReq.add(userId); else revertedReq.delete(userId);
      setFollowing(reverted);
      setRequested(revertedReq);
    }
  };

  const handleFollow = (username: string, userId: string) => {
    if (following.has(userId) || requested.has(userId)) {
      feedimAlert("question", "Takibi bırakmak istiyor musunuz?", { showYesNo: true, onYes: () => doFollowToggle(username, userId) });
      return;
    }
    doFollowToggle(username, userId);
  };

  const dativeName = getDativeSuffix(planId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      centerOnDesktop
      title="Premium"
      infoText="Premium aboneliğinle onaylı rozet, reklamsız deneyim, para kazanma ve daha birçok özelliğe erişebilirsin. Detaylar için Ayarlar > Abonelik sayfasını ziyaret et."
      footer={
        <div className="px-6 py-4 border-t border-border-primary">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-full bg-accent-main text-white font-semibold text-[0.95rem] hover:opacity-90 transition-all active:scale-[0.97]"
          >
            Keşfetmeye Başla
          </button>
        </div>
      }
    >
      <div className="px-6 pt-8 pb-5 text-center">
        {/* Avatar + Badge */}
        <div className="relative inline-block mb-5">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-[82px] h-[82px] rounded-full object-cover ring-4 ring-bg-secondary" />
          ) : (
            <img className="default-avatar-auto w-[82px] h-[82px] rounded-full object-cover ring-4 ring-bg-secondary" alt="" />
          )}
          <div className="absolute -bottom-1 -right-1">
            <VerifiedBadge size="lg" variant={badgeVariant} className="!h-[28px] !w-[28px] !min-w-[28px] drop-shadow-md" />
          </div>
        </div>

        {/* Welcome text */}
        <h2 className="text-[1.35rem] font-extrabold mb-1.5">
          Premium {dativeName} Hoş Geldin!
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {fullName ? `Merhaba ${fullName}, artık bir Premium üyesin` : "Artık bir Premium üyesin"}
        </p>

        {/* Perks */}
        <div className="text-left space-y-3 mb-6">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-accent-main/10 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-accent-main" strokeWidth={3} />
              </div>
              <span className="text-[0.88rem] font-medium">{perk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestion Widget */}
      {users.length > 0 && (
        <div className="mx-4 mb-5 bg-bg-tertiary rounded-[10px] p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <span className="text-[0.95rem] font-bold">Kişileri Bul</span>
            <Link href="/dashboard/suggestions" onClick={onClose} className="text-[0.75rem] font-medium text-text-muted hover:text-text-primary transition">
              Tümünü gör
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
                  <FollowButton following={following.has(u.user_id) || requested.has(u.user_id)} isPrivate={requested.has(u.user_id)} onClick={() => handleFollow(u.username, u.user_id)} />
                }
              />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
