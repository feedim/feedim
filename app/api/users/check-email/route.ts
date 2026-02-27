import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidEmail } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) return NextResponse.json({ error: "Email gerekli" }, { status: 400 });

  if (!isValidEmail(email)) {
    return NextResponse.json({ available: false, reason: "Geçersiz format" });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", email.toLowerCase())
    .single();

  return NextResponse.json({ available: !data });
}
