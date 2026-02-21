import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — fetch notifications with unread count
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        return NextResponse.json({ unread_count: 0, paused: true });
      }

      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .gte("created_at", thirtyDaysAgo);
      return NextResponse.json({ unread_count: count || 0 });
    }

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
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
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    for (const bid of blockedIds) {
      query = query.neq("actor_id", bid);
    }

    let { data: notifications, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Filter out notifications from inactive actors (frozen, blocked, deleted)
    if (notifications && notifications.length > 0) {
      const actorIds = [...new Set(notifications.map((n: any) => n.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const admin = createAdminClient();
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
      notifications: notifications || [],
      hasMore: (notifications || []).length >= limit,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// PUT — mark all as read
export async function PUT(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE — delete a single notification
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const notifId = request.nextUrl.searchParams.get("id");
    if (!notifId) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notifId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
