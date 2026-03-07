import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import ProfileView from "@/components/ProfileView";
import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";
import { getAnyProfileByUsername, getCachedLatestUsernameRedirect, getCachedPublicProfileByUsername } from "@/lib/profileQueries";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };

interface PageProps {
  params: Promise<{ username: string }>;
}

interface FollowCountResult {
  count: number | null;
}

interface FollowIdRow {
  following_id: string;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getCachedPublicProfileByUsername(username);
  const t = await getTranslations("profile");
  if (!profile) return { title: t("userNotFound") };

  const locale = await getLocale();
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
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: "summary",
      title: `${displayName} (@${profile.username})`,
      description: profileDesc,
    },
    alternates: {
      canonical: `${baseUrl}/u/${profile.username}`,
      languages: getAlternateLanguages(`/u/${profile.username}`),
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  let profile = await getCachedPublicProfileByUsername(username);
  if (!profile) {
    const redirectedUsername = await getCachedLatestUsernameRedirect(username);
    if (redirectedUsername) redirect(`/u/${redirectedUsername}`);
    // Allow own profile or admin/mod to view non-active profiles
    const viewerId = await getAuthUserId();
    if (viewerId) {
      const anyProfile = await getAnyProfileByUsername(username);
      if (anyProfile) {
        const isOwner = anyProfile.user_id === viewerId;
        if (isOwner) {
          profile = anyProfile;
        } else {
          const admin = createAdminClient();
          const { data: viewer } = await admin
            .from('profiles')
            .select('role')
            .eq('user_id', viewerId)
            .single();
          if (viewer && (viewer.role === 'admin' || viewer.role === 'moderator')) {
            profile = anyProfile;
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
  const [followResult, blockResult, requestCountResult, myFollowsResult, followsMeResult] = await Promise.all([
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
    // Check if target user follows the current viewer
    userId && !isOwn
      ? admin.from("follows").select("id").eq("follower_id", profile.user_id).eq("following_id", userId).single()
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
  const followRequestCount = (requestCountResult as FollowCountResult).count || 0;

  // ── Round 2: Conditional parallel queries ──
  const myFollowingIds = ((myFollowsResult.data as FollowIdRow[] | null) || []).map((f) => f.following_id);

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
      .in("user_id", theirFollowers.map(f => f.follower_id))
      .eq("status", "active");
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
        profile={{ ...profile, is_following: isFollowing, is_own: isOwn, follows_me: !!followsMeResult.data, has_follow_request: hasFollowRequest, follow_request_count: followRequestCount, is_blocked: isBlocked, is_blocked_by: isBlockedBy, mutual_followers: mutualFollowers }}
      />
    </>
  );
}
