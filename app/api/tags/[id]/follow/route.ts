import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cache } from "@/lib/cache";
import { safeError } from "@/lib/apiError";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_TAG_FOLLOWS = 10;

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tagId = parseInt(id);
    if (isNaN(tagId)) return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if already following
    const { data: existing } = await supabase
      .from("tag_follows")
      .select("tag_id")
      .eq("user_id", user.id)
      .eq("tag_id", tagId)
      .single();

    if (existing) {
      // Unfollow
      await supabase
        .from("tag_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("tag_id", tagId);
      cache.delete(`user:${user.id}:tag-follows`);
      return NextResponse.json({ following: false });
    }

    // Check max limit
    const { count } = await supabase
      .from("tag_follows")
      .select("tag_id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= MAX_TAG_FOLLOWS) {
      return NextResponse.json({ error: `En fazla ${MAX_TAG_FOLLOWS} etiket takip edebilirsiniz` }, { status: 400 });
    }

    // Follow
    const { error } = await supabase
      .from("tag_follows")
      .insert({ user_id: user.id, tag_id: tagId });

    if (error) return safeError(error);

    cache.delete(`user:${user.id}:tag-follows`);
    return NextResponse.json({ following: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
