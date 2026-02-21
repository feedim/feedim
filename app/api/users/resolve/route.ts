import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Resolve username to email for login
export async function POST(req: NextRequest) {
  const { identifier } = await req.json();
  if (!identifier) return NextResponse.json({ error: "Identifier gerekli" }, { status: 400 });

  const supabase = await createClient();

  // If it looks like an email, return as-is
  if (identifier.includes("@")) {
    return NextResponse.json({ email: identifier });
  }

  // Otherwise, look up by username
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("username", identifier.toLowerCase())
    .single();

  if (!data) {
    return NextResponse.json({ error: "Geçersiz kimlik bilgileri" }, { status: 404 });
  }

  return NextResponse.json({ email: data.email });
}
