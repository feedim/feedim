import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";

// GET: Fetch user's blocked words
export async function GET() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("blocked_words")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ words: data?.blocked_words || [] });
  } catch {
    return NextResponse.json({ words: [] });
  }
}

// PUT: Update user's blocked words
export async function PUT(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const { words } = await req.json();

    if (!Array.isArray(words) || words.length > 50) {
      return NextResponse.json({ error: tErrors("invalidInput") }, { status: 400 });
    }

    // Sanitize: lowercase, trim, deduplicate, max 30 chars each
    const sanitized = [...new Set(
      words
        .filter((w: unknown) => typeof w === "string")
        .map((w: string) => w.trim().toLowerCase().slice(0, 30))
        .filter((w: string) => w.replace(/\s/g, "").length >= 3)
    )].slice(0, 50);

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ blocked_words: sanitized })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true, words: sanitized });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
