import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    if (isNaN(postId)) return NextResponse.json({ error: "Geçersiz ID" }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { platform } = await request.json();
    if (!platform || typeof platform !== "string") {
      return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify post exists
    const { data: post } = await admin
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });

    // Insert into shares table — trigger updates share_count on posts
    await admin.from("shares").insert({
      user_id: user.id,
      post_id: postId,
      platform,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
