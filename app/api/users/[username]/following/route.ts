import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { safePage } from "@/lib/utils";
import { countActiveFollowing } from "@/lib/followCounts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const { username } = await params;
    const supabase = await createClient();
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const page = safePage(searchParams.get("page"));
    const limit = 10;

    // Require auth for pagination (page > 1)
    if (page > 1) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, account_private, following_count")
      .eq("username", username)
      .eq("status", "active")
      .single();

    if (!profile) {
      return NextResponse.json({ error: tErrors("userNotFound") }, { status: 404 });
    }

    // Private account: restrict following list to owner, followers, and staff
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (profile.account_private && authUser?.id !== profile.user_id) {
      let canView = false;
      if (authUser) {
        const { data: vp } = await admin.from("profiles").select("role").eq("user_id", authUser.id).single();
        if (vp?.role === "admin" || vp?.role === "moderator") canView = true;
        if (!canView) {
          const { data: f } = await admin.from("follows").select("id").eq("follower_id", authUser.id).eq("following_id", profile.user_id).single();
          if (f) canView = true;
        }
      }
      if (!canView) return NextResponse.json({ users: [], hasMore: false });
    }

    const from = (page - 1) * limit;
    const to = from + limit; // fetch 1 extra for hasMore detection

    const { data: follows, error } = await admin
      .from("follows")
      .select("following_id")
      .eq("follower_id", profile.user_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) return safeError(error);

    if (!follows || follows.length === 0) {
      if (page === 1 && profile.following_count > 0) {
        void admin.from("profiles").update({ following_count: 0 }).eq("user_id", profile.user_id);
      }
      return NextResponse.json({ users: [], hasMore: false, totalCount: 0 });
    }

    const rawHasMore = follows.length > limit;
    let ids = follows.slice(0, limit).map(f => f.following_id);

    // Check which users the current user follows + which follow the current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Filter out blocked users
    if (currentUser) {
      const { data: blocks } = await admin
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${currentUser.id},blocked_id.eq.${currentUser.id}`);
      if (blocks && blocks.length > 0) {
        const blockedIds = new Set<string>();
        for (const b of blocks) {
          blockedIds.add(b.blocker_id === currentUser.id ? b.blocked_id : b.blocker_id);
        }
        ids = ids.filter(id => !blockedIds.has(id));
        if (ids.length === 0) return NextResponse.json({ users: [], hasMore: rawHasMore });
      }
    }

    const { data: users } = await admin
      .from("profiles")
      .select("user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio, account_private")
      .in("user_id", ids)
      .eq("status", "active");
    let followingSet = new Set<string>();
    let requestedSet = new Set<string>();
    let followsMeSet = new Set<string>();
    if (currentUser) {
      const [myFollowsRes, myRequestsRes, followsMeRes] = await Promise.all([
        admin.from("follows").select("following_id").eq("follower_id", currentUser.id).in("following_id", ids),
        admin.from("follow_requests").select("target_id").eq("requester_id", currentUser.id).eq("status", "pending").in("target_id", ids),
        admin.from("follows").select("follower_id").eq("following_id", currentUser.id).in("follower_id", ids),
      ]);
      followingSet = new Set((myFollowsRes.data || []).map(f => f.following_id));
      requestedSet = new Set((myRequestsRes.data || []).map(f => f.target_id));
      followsMeSet = new Set((followsMeRes.data || []).map(f => f.follower_id));
    }

    // Preserve original follows order (newest first), admins always on top
    const isOwnProfile = currentUser?.id === profile.user_id;
    const userMap = new Map((users || []).map(u => [u.user_id, u]));
    const enrichedUsers = ids
      .map(id => userMap.get(id))
      .filter(Boolean)
      .map(u => ({
        ...u!,
        is_following: followingSet.has(u!.user_id),
        is_requested: requestedSet.has(u!.user_id),
        follows_me: followsMeSet.has(u!.user_id),
        is_own: currentUser?.id === u!.user_id,
        is_own_profile: isOwnProfile,
      }))
      .sort((a, b) => (b.role === 'admin' ? 1 : 0) - (a.role === 'admin' ? 1 : 0));

    // On page 1, calculate accurate totalCount and auto-heal stored count
    let totalCount: number | undefined;
    if (page === 1) {
      const activeCount = await countActiveFollowing(admin, profile.user_id);
      totalCount = activeCount;
      if (activeCount !== profile.following_count) {
        void admin.from("profiles").update({ following_count: activeCount }).eq("user_id", profile.user_id);
      }
    }

    return NextResponse.json({
      users: enrichedUsers,
      hasMore: rawHasMore,
      ...(totalCount !== undefined && { totalCount }),
    });
  } catch (err) {
    return safeError(err);
  }
}
