import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";

const NOTIFICATION_SETTING_TYPES = [
  "like", "comment", "reply", "mention", "follow",
  "follow_request", "follow_accepted",
  "milestone", "coin_earned", "gift_received", "system",
  "view_milestone", "device_login",
];

// GET — fetch notification settings
export async function GET() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("notification_settings, notifications_paused_until")
      .eq("user_id", user.id)
      .single();

    if (error) return safeError(error);

    // Default: all enabled
    const defaults: Record<string, boolean> = {};
    for (const t of NOTIFICATION_SETTING_TYPES) defaults[t] = true;

    const settings = profile?.notification_settings || defaults;
    const pausedUntil = profile?.notifications_paused_until || null;
    const isPaused = pausedUntil ? new Date(pausedUntil) > new Date() : false;

    return NextResponse.json({ settings, pausedUntil, isPaused });
  } catch (err) {
    console.error("[notifications/settings GET]", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PUT — update notification settings
export async function PUT(req: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, any> = {};

  // Toggle specific notification types
  if (body.settings && typeof body.settings === "object") {
    updates.notification_settings = body.settings;
  }

  // Pause notifications for 24 hours
  if (body.pause === true) {
    updates.notifications_paused_until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  } else if (body.pause === false) {
    updates.notifications_paused_until = null;
  }

  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select("notifications_paused_until")
    .single();

  if (error) return safeError(error);

  const pausedUntil = updated?.notifications_paused_until || null;
  const isPaused = pausedUntil ? new Date(pausedUntil) > new Date() : false;
  return NextResponse.json({ success: true, pausedUntil, isPaused });
}
