import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ERROR_LOG_SETTINGS_KEY = "error_log_enabled";

async function isErrorLogEnabled(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", ERROR_LOG_SETTINGS_KEY)
    .single();
  return !!data?.value?.enabled;
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") return null;
  return user;
}

// POST — log a client error
export async function POST(request: NextRequest) {
  try {
    const enabled = await isErrorLogEnabled();
    if (!enabled) return NextResponse.json({ ok: true });

    const body = await request.json();
    const { error_hash, message, source, url, user_agent } = body;
    if (!error_hash || !message) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check if this error already exists (deduplication by hash)
    const { data: existing } = await admin
      .from("error_logs")
      .select("id, count")
      .eq("error_hash", String(error_hash))
      .single();

    if (existing) {
      // Increment count and update last_seen
      await admin
        .from("error_logs")
        .update({ count: (existing.count || 1) + 1, last_seen: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      // Insert new error
      await admin.from("error_logs").insert({
        error_hash: String(error_hash),
        message: String(message).slice(0, 2000),
        source: source ? String(source).slice(0, 500) : null,
        url: url ? String(url).slice(0, 500) : null,
        user_agent: user_agent ? String(user_agent).slice(0, 500) : null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

// GET — list error logs (admin only)
export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "access_denied" }, { status: 403 });

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("error_logs")
    .select("*")
    .order("last_seen", { ascending: false })
    .limit(500);

  const enabled = await isErrorLogEnabled();

  return NextResponse.json({ logs: logs || [], enabled });
}

// DELETE — clear all logs or toggle off (admin only)
export async function DELETE() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "access_denied" }, { status: 403 });

  const admin = createAdminClient();
  // Delete all error logs
  await admin.from("error_logs").delete().neq("id", 0);
  // Disable error logging
  await admin
    .from("site_settings")
    .upsert({ key: ERROR_LOG_SETTINGS_KEY, value: { enabled: false } }, { onConflict: "key" });

  return NextResponse.json({ ok: true });
}

// PUT — toggle error logging on/off (admin only)
export async function PUT(request: NextRequest) {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "access_denied" }, { status: 403 });

  const body = await request.json();
  const enabled = !!body.enabled;

  const admin = createAdminClient();
  await admin
    .from("site_settings")
    .upsert({ key: ERROR_LOG_SETTINGS_KEY, value: { enabled } }, { onConflict: "key" });

  // If disabling, clear all logs
  if (!enabled) {
    await admin.from("error_logs").delete().neq("id", 0);
  }

  return NextResponse.json({ ok: true, enabled });
}
