import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import ProfileView from "@/components/ProfileView";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getProfile(username: string) {
  // Use admin client for public profile reads — no auth dependency
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("username", username)
    .eq("status", "active")
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: "Kullanici bulunamadi" };

  const displayName = profile.full_name || profile.username;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";

  return {
    title: `${displayName} (@${profile.username}) | Feedim`,
    description: profile.bio || `${displayName} Feedim profilini inceleyin.`,
    keywords: [displayName, profile.username, "feedim", "profil", "içerik", "yazar"],
    openGraph: {
      title: `${displayName} (@${profile.username})`,
      description: profile.bio || `${displayName} Feedim profilini inceleyin.`,
      type: "profile",
      url: `${baseUrl}/u/${profile.username}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 200, height: 200 }] : undefined,
      siteName: "Feedim",
      locale: "tr_TR",
    },
    twitter: {
      card: "summary",
      title: `${displayName} (@${profile.username})`,
      description: profile.bio || `${displayName} Feedim profilini inceleyin.`,
    },
    alternates: {
      canonical: `${baseUrl}/u/${profile.username}`,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) {
    // Check if this is an old username that was changed
    const admin = createAdminClient();
    const { data: redir } = await admin
      .from("username_redirects")
      .select("new_username")
      .eq("old_username", username)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (redir) redirect(`/u/${redir.new_username}`);
    notFound();
  }

  const userId = await getAuthUserId();
  const admin = createAdminClient();

  let isFollowing = false;
  let hasFollowRequest = false;
  const isOwn = userId === profile.user_id;
  if (userId && !isOwn) {
    const { data: follow } = await admin
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", profile.user_id)
      .single();
    isFollowing = !!follow;

    if (!isFollowing) {
      const { data: req } = await admin
        .from("follow_requests")
        .select("id")
        .eq("requester_id", userId)
        .eq("target_id", profile.user_id)
        .eq("status", "pending")
        .single();
      hasFollowRequest = !!req;
    }
  }

  // Check block status (bidirectional)
  let isBlocked = false;
  let isBlockedBy = false;
  if (userId && !isOwn) {
    const { data: blockData } = await admin
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`and(blocker_id.eq.${userId},blocked_id.eq.${profile.user_id}),and(blocker_id.eq.${profile.user_id},blocked_id.eq.${userId})`)
      .limit(1);
    if (blockData && blockData.length > 0) {
      isBlocked = blockData[0].blocker_id === userId;
      isBlockedBy = blockData[0].blocked_id === userId;
    }
  }

  // Check pending follow request count (for own profile)
  let followRequestCount = 0;
  if (isOwn && userId) {
    const { count } = await admin
      .from("follow_requests")
      .select("id", { count: "exact", head: true })
      .eq("target_id", userId)
      .eq("status", "pending");
    followRequestCount = count || 0;
  }

  // Load mutual followers (not own, not blocked)
  let mutualFollowers: { username: string; avatar_url: string | null; full_name: string | null }[] = [];
  if (userId && !isOwn && !isBlocked && !isBlockedBy) {
    const { data: myFollows } = await admin
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);
    const myFollowingIds = (myFollows || []).map(f => f.following_id);

    if (myFollowingIds.length > 0) {
      const { data: theirFollowers } = await admin
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.user_id)
        .in("follower_id", myFollowingIds)
        .limit(5);

      if (theirFollowers && theirFollowers.length > 0) {
        const { data: mutualProfiles } = await admin
          .from("profiles")
          .select("username, avatar_url, full_name")
          .in("user_id", theirFollowers.map(f => f.follower_id));
        mutualFollowers = mutualProfiles || [];
      }
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.full_name || profile.username,
      url: `${baseUrl}/u/${profile.username}`,
      image: profile.avatar_url || undefined,
      description: profile.bio || undefined,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProfileView
        profile={{ ...profile, is_following: isFollowing, is_own: isOwn, has_follow_request: hasFollowRequest, follow_request_count: followRequestCount, is_blocked: isBlocked, is_blocked_by: isBlockedBy, mutual_followers: mutualFollowers }}
      />
    </>
  );
}
