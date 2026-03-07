import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { PUBLIC_PROFILE_SELECT } from "@/lib/profilePublic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();

  let profile: any = null;

  // Try active profile first
  const { data: activeProfile } = await supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .eq("username", username)
    .eq("status", "active")
    .single();

  if (activeProfile) {
    profile = activeProfile;
  } else {
    // Check if viewer is staff (admin/moderator) — allow viewing any profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const adminClient = createAdminClient();
      const { data: viewerP } = await adminClient.from('profiles').select('role').eq('user_id', user.id).single();
      const isStaff = viewerP?.role === 'admin' || viewerP?.role === 'moderator';
      if (isStaff) {
        const { data: anyProfile } = await adminClient.from('profiles').select(PUBLIC_PROFILE_SELECT).eq('username', username).single();
        if (anyProfile) profile = anyProfile;
      } else {
        // Check if it's the user's own profile
        const { data: ownProfile } = await adminClient.from('profiles').select(PUBLIC_PROFILE_SELECT).eq('username', username).eq('user_id', user.id).single();
        if (ownProfile) profile = ownProfile;
      }
    }
  }

  if (!profile) {
    // Check username redirects
    const { data: redir } = await supabase
      .from("username_redirects")
      .select("new_username")
      .eq("old_username", username)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (redir) {
      return NextResponse.json({ redirect: `/u/${redir.new_username}`, new_username: redir.new_username }, { status: 301 });
    }
    const tErrors = await getTranslations("apiErrors");
    return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
  }

  // Check if current user follows this profile
  let isFollowing = false;
  let isBlocked = false;
  let mutual_followers: { username: string; avatar_url: string | null; full_name: string | null }[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  const isOwn = user?.id === profile.user_id;

  if (user && !isOwn) {
    // Parallel: fetch follow, follow request, blocks, follows-back, blocked-by, mutual followers
    const [
      { data: follow },
      { data: followReq },
      { data: block },
      { data: followsBack },
      { data: blockedBy },
      { data: myFollowing },
    ] = await Promise.all([
      supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.user_id).single(),
      supabase.from("follow_requests").select("id").eq("requester_id", user.id).eq("target_id", profile.user_id).eq("status", "pending").single(),
      supabase.from("blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", profile.user_id).single(),
      supabase.from("follows").select("id").eq("follower_id", profile.user_id).eq("following_id", user.id).single(),
      supabase.from("blocks").select("id").eq("blocker_id", profile.user_id).eq("blocked_id", user.id).single(),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);

    isFollowing = !!follow;
    if (!isFollowing && followReq) {
      // @ts-ignore — dynamic property
      profile.has_follow_request = true;
    }
    isBlocked = !!block;
    if (followsBack) {
      // @ts-ignore
      profile.follows_me = true;
    }
    if (blockedBy) {
      // @ts-ignore
      profile.is_blocked_by = true;
    }

    // Mutual followers (second stage — depends on myFollowing result)
    if (myFollowing && myFollowing.length > 0) {
      const myFollowingIds = myFollowing.map(f => f.following_id);
      const { data: mutuals } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.user_id)
        .in("follower_id", myFollowingIds)
        .limit(3);

      if (mutuals && mutuals.length > 0) {
        const { data: mutualProfiles } = await supabase
          .from("profiles")
          .select("username, avatar_url, full_name")
          .in("user_id", mutuals.map(m => m.follower_id));
        mutual_followers = mutualProfiles || [];
      }
    }
  }

  // Coin balance only visible to own profile
  let coin_balance: number | undefined;
  if (isOwn) {
    const { data: ownData } = await supabase
      .from("profiles")
      .select("coin_balance")
      .eq("user_id", user!.id)
      .single();
    coin_balance = ownData?.coin_balance || 0;
  }

  return NextResponse.json({
    profile: {
      ...profile,
      is_following: isFollowing,
      is_own: isOwn,
      is_blocked: isBlocked,
      mutual_followers,
      ...(coin_balance !== undefined && { coin_balance }),
    },
  });
  } catch (err) {
    return safeError(err);
  }
}
