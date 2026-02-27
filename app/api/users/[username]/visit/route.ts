import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeError } from "@/lib/apiError";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: true });

  const { data: target } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("username", username)
    .single();

  if (!target || target.user_id === user.id) return NextResponse.json({ success: true });

  await supabase.from("profile_visits").insert({
    visited_id: target.user_id,
    visitor_id: user.id,
  });

  return NextResponse.json({ success: true });
  } catch (err) {
    return safeError(err);
  }
}
