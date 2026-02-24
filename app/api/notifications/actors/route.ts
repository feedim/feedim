import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const idsParam = req.nextUrl.searchParams.get("ids");
    if (!idsParam) return NextResponse.json({ users: [], hasMore: false });

    const notificationIds = idsParam.split(",").map(Number).filter(n => !isNaN(n));
    if (notificationIds.length === 0) return NextResponse.json({ users: [], hasMore: false });

    const admin = createAdminClient();

    // Fetch notifications to get actor_ids (only for this user)
    const { data: notifs } = await admin
      .from("notifications")
      .select("actor_id")
      .eq("user_id", user.id)
      .in("id", notificationIds);

    if (!notifs || notifs.length === 0) return NextResponse.json({ users: [], hasMore: false });

    const actorIds = [...new Set(notifs.filter(n => n.actor_id).map(n => n.actor_id!))];
    if (actorIds.length === 0) return NextResponse.json({ users: [], hasMore: false });

    // Fetch actor profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, username, full_name, avatar_url, is_verified, premium_plan, role, bio")
      .in("user_id", actorIds)
      .neq("status", "banned");

    const users = (profiles || []).map(p => ({
      user_id: p.user_id,
      username: p.username,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      is_verified: p.is_verified,
      premium_plan: p.premium_plan,
      role: p.role,
      bio: p.bio,
    }));

    return NextResponse.json({ users, hasMore: false });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
