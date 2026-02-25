import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Onboarding ilgi alanı önerileri.
 * Cron tarafından AI ile derlenip suggested_tags tablosuna kaydedilen
 * etiketleri dile göre döndürür.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lang = request.nextUrl.searchParams.get("lang") || "tr";
    const admin = createAdminClient();

    // suggested_tags tablosundan dile göre çek
    const { data: suggested } = await admin
      .from("suggested_tags")
      .select("tag_id, position, tags(id, name, slug, post_count)")
      .eq("language", lang)
      .order("position", { ascending: true });

    const tags = (suggested || [])
      .map((s: any) => s.tags)
      .filter(Boolean);

    // Eğer bu dil için öneri yoksa fallback: en popüler etiketler
    if (tags.length === 0) {
      const { data: fallback } = await admin
        .from("tags")
        .select("id, name, slug, post_count")
        .order("post_count", { ascending: false })
        .gt("post_count", 1)
        .limit(10);
      const response = NextResponse.json({ tags: fallback || [] });
      response.headers.set("Cache-Control", "public, s-maxage=86400");
      return response;
    }

    const response = NextResponse.json({ tags });
    response.headers.set("Cache-Control", "public, s-maxage=86400");
    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
