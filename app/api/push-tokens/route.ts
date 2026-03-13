import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/push-tokens — Register a device push token.
 * Body: { token: string, platform: "ios" | "android" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token = body?.token;
  const platform = body?.platform;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert: if same token exists for this user, update timestamp
  // If token exists for another user, reassign it (device changed account)
  const { error } = await admin
    .from("device_push_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform: platform || "ios",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );

  if (error) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/push-tokens?token=... — Remove a device push token (logout).
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("device_push_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);

  return NextResponse.json({ ok: true });
}
