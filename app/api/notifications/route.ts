import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_SOCIAL_TYPES, NOTIFICATION_SYSTEM_TYPES } from "@/lib/constants";
import { buildPrivateCacheControl, FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";
import { safePage } from "@/lib/utils";

const FOLLOW_REQUIRED_NOTIFICATION_TYPES = new Set(["first_post", "comeback_post"]);

async function filterFollowerOnlyNotifications<T extends { type: string; actor_id?: string | null }>(
  admin: ReturnType<typeof createAdminClient>,
  viewerId: string,
  notifications: T[]
) {
  const gatedActorIds = [...new Set(
    notifications
      .filter((n) => FOLLOW_REQUIRED_NOTIFICATION_TYPES.has(n.type) && n.actor_id)
      .map((n) => n.actor_id!)
  )];

  if (gatedActorIds.length === 0) return notifications;

  const { data: follows } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", gatedActorIds);

  const allowedActorIds = new Set((follows || []).map((f) => f.following_id));

  return notifications.filter((n) =>
    !FOLLOW_REQUIRED_NOTIFICATION_TYPES.has(n.type) || !n.actor_id || allowedActorIds.has(n.actor_id)
  );
}

// GET — fetch notifications with unread count
export async function GET(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const countOnly = request.nextUrl.searchParams.get("count") === "true";

    // Only show notifications from the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    if (countOnly) {
      // Check if notifications are paused
      const { data: profile } = await supabase
        .from("profiles")
        .select("notifications_paused_until")
        .eq("user_id", user.id)
        .single();
      if (profile?.notifications_paused_until && new Date(profile.notifications_paused_until) > new Date()) {
        const response = NextResponse.json({ unread_count: 0, paused: true });
        response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.notificationCount));
        return response;
      }

      const tab = request.nextUrl.searchParams.get("tab");
      let query = supabase
        .from("notifications")
        .select("id, actor_id, type")
        .eq("user_id", user.id)
        .eq("is_read", false)
        .gte("created_at", thirtyDaysAgo);

      if (tab === "system") {
        query = query.in("type", NOTIFICATION_SYSTEM_TYPES as unknown as string[]);
      } else if (tab === "social") {
        query = query.in("type", NOTIFICATION_SOCIAL_TYPES as unknown as string[]);
      }

      const { data: unreadNotifs } = await query;
      if (!unreadNotifs || unreadNotifs.length === 0) {
        const response = NextResponse.json({ unread_count: 0 });
        response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.notificationCount));
        return response;
      }

      const admin = createAdminClient();
      const gatedUnreadNotifs = await filterFollowerOnlyNotifications(admin, user.id, unreadNotifs);
      if (gatedUnreadNotifs.length === 0) {
        const response = NextResponse.json({ unread_count: 0 });
        response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.notificationCount));
        return response;
      }

      // Filter out inactive actors (frozen, deleted, etc.)
      const actorIds = [...new Set(gatedUnreadNotifs.filter(n => n.actor_id).map(n => n.actor_id))];
      let inactiveActors = new Set<string>();
      if (actorIds.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("user_id, status")
          .in("user_id", actorIds);
        inactiveActors = new Set(
          (profiles || []).filter(p => p.status !== "active").map(p => p.user_id)
        );
      }

      // Filter out blocked users
      const { data: blocks } = await supabase
        .from("blocks")
        .select("blocked_id, blocker_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      const blockedIds = new Set((blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id));

      const count = gatedUnreadNotifs.filter(n =>
        !n.actor_id || (!inactiveActors.has(n.actor_id) && !blockedIds.has(n.actor_id))
      ).length;

      const response = NextResponse.json({ unread_count: count });
      response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.notificationCount));
      return response;
    }

    const page = safePage(request.nextUrl.searchParams.get("page"));
    const limit = 20;
    const offset = (page - 1) * limit;

    // Filter out notifications from blocked users
    const { data: blocks } = await supabase
      .from("blocks")
      .select("blocked_id, blocker_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    const blockedIds = (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id);

    let query = supabase
      .from("notifications")
      .select("id, user_id, actor_id, type, object_type, object_id, content, is_read, created_at")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    for (const bid of blockedIds) {
      query = query.neq("actor_id", bid);
    }

    let { data: notifications, error } = await query;
    if (error) return safeError(error);
    const admin = createAdminClient();
    notifications = await filterFollowerOnlyNotifications(admin, user.id, notifications || []);

    // Filter out notifications from inactive actors (frozen, blocked, deleted)
    if (notifications && notifications.length > 0) {
      const actorIds = [...new Set(notifications.map((n: any) => n.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const { data: actorProfiles } = await admin
          .from("profiles")
          .select("user_id, status")
          .in("user_id", actorIds);
        const inactiveActors = new Set(
          (actorProfiles || []).filter(p => p.status !== "active").map(p => p.user_id)
        );
        notifications = notifications.filter((n: any) => !n.actor_id || !inactiveActors.has(n.actor_id));
      }
    }

    return NextResponse.json({
      notifications: (notifications || []).slice(0, limit),
      hasMore: (notifications || []).length > limit,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PUT — mark all as read
export async function PUT(_req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return safeError(error);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// DELETE — delete a single notification
export async function DELETE(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const notifId = request.nextUrl.searchParams.get("id");
    if (!notifId) return NextResponse.json({ error: tErrors("idRequired") }, { status: 400 });

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notifId)
      .eq("user_id", user.id);

    if (error) return safeError(error);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
