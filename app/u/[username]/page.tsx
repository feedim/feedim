import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import ProfileView from "@/components/ProfileView";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("profile");
  if (!profile) return { title: t("userNotFound") };

  const displayName = profile.full_name || profile.username;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const profileDesc = profile.bio || t("viewProfile", { name: displayName });

  return {
    title: `${displayName} (@${profile.username}) | Feedim`,
    description: profileDesc,
    openGraph: {
      title: `${displayName} (@${profile.username})`,
      description: profileDesc,
      type: "profile",
      url: `${baseUrl}/u/${profile.username}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 200, height: 200 }] : undefined,
      siteName: "Feedim",
    },
    twitter: {
      card: "summary",
      title: `${displayName} (@${profile.username})`,
      description: profileDesc,
    },
    alternates: {
      canonical: `${baseUrl}/u/${profile.username}`,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  let profile = await getProfile(username);
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
    // Allow own profile or admin/mod to view non-active profiles
    const viewerId = await getAuthUserId();
    if (viewerId) {
      const { data: anyProfile } = await admin
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      if (anyProfile) {
        const isOwner = anyProfile.user_id === viewerId;
        if (isOwner) {
          profile = anyProfile as any;
        } else {
          const { data: viewer } = await admin
            .from('profiles')
            .select('role')
            .eq('user_id', viewerId)
            .single();
          if (viewer && (viewer.role === 'admin' || viewer.role === 'moderator')) {
            profile = anyProfile as any;
          }
        }
      }
    }
    if (!profile) notFound();
  }

  const userId = await getAuthUserId();
  const admin = createAdminClient();

  const isOwn = userId === profile.user_id;

  // ── Round 1: All independent queries in parallel ──
  const [followResult, blockResult, requestCountResult, myFollowsResult] = await Promise.all([
    // Follow check (only if viewing someone else's profile)
    userId && !isOwn
      ? admin.from("follows").select("id").eq("follower_id", userId).eq("following_id", profile.user_id).single()
      : Promise.resolve({ data: null }),
    // Block check (bidirectional)
    userId && !isOwn
      ? admin.from("blocks").select("blocker_id, blocked_id").or(`and(blocker_id.eq.${userId},blocked_id.eq.${profile.user_id}),and(blocker_id.eq.${profile.user_id},blocked_id.eq.${userId})`).limit(1)
      : Promise.resolve({ data: null }),
    // Pending follow request count (own profile)
    isOwn && userId
      ? admin.from("follow_requests").select("id", { count: "exact", head: true }).eq("target_id", userId).eq("status", "pending")
      : Promise.resolve({ count: null }),
    // My follows (for mutual followers calculation)
    userId && !isOwn
      ? admin.from("follows").select("following_id").eq("follower_id", userId)
      : Promise.resolve({ data: null }),
  ]);

  const isFollowing = !!followResult.data;
  const blockData = blockResult.data as { blocker_id: string; blocked_id: string }[] | null;
  let isBlocked = false;
  let isBlockedBy = false;
  if (blockData && blockData.length > 0) {
    isBlocked = blockData[0].blocker_id === userId;
    isBlockedBy = blockData[0].blocked_id === userId;
  }
  const followRequestCount = (requestCountResult as any).count || 0;

  // ── Round 2: Conditional parallel queries ──
  const myFollowingIds = ((myFollowsResult.data as any[]) || []).map((f: any) => f.following_id);

  const [followRequestResult, theirFollowersResult] = await Promise.all([
    // Follow request check (only if not following)
    userId && !isOwn && !isFollowing
      ? admin.from("follow_requests").select("id").eq("requester_id", userId).eq("target_id", profile.user_id).eq("status", "pending").single()
      : Promise.resolve({ data: null }),
    // Mutual followers lookup
    userId && !isOwn && !isBlocked && !isBlockedBy && myFollowingIds.length > 0
      ? admin.from("follows").select("follower_id").eq("following_id", profile.user_id).in("follower_id", myFollowingIds).limit(5)
      : Promise.resolve({ data: null }),
  ]);

  const hasFollowRequest = !!followRequestResult.data;

  // ── Round 3: Mutual follower profiles (if any) ──
  let mutualFollowers: { username: string; avatar_url: string | null; full_name: string | null }[] = [];
  const theirFollowers = theirFollowersResult.data as { follower_id: string }[] | null;
  if (theirFollowers && theirFollowers.length > 0) {
    const { data: mutualProfiles } = await admin
      .from("profiles")
      .select("username, avatar_url, full_name")
      .in("user_id", theirFollowers.map(f => f.follower_id));
    mutualFollowers = mutualProfiles || [];
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
