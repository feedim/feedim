import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.status !== "frozen") {
    return NextResponse.json({ error: "Hesabınız dondurulmuş değil" }, { status: 400 });
  }

  await admin.from("profiles").update({
    status: "active",
    frozen_at: null,
    moderation_reason: null,
  }).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
