import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: null }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("status, moderation_reason, frozen_at, updated_at")
    .eq("user_id", user.id)
    .single();

  const status = profile?.status || "active";

  // For non-active accounts, include latest moderation decision
  let latest_decision = null;
  if (status !== "active") {
    const { data: decision } = await supabase
      .from("moderation_decisions")
      .select("decision_code, decision, reason, created_at")
      .eq("target_type", "user")
      .eq("target_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    latest_decision = decision || null;
  }

  return NextResponse.json({
    status,
    moderation_reason: profile?.moderation_reason || null,
    frozen_at: profile?.frozen_at || null,
    updated_at: profile?.updated_at || null,
    latest_decision,
  });
}
