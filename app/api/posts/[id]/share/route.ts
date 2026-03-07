import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEmailVerified } from "@/lib/emailGate";
import { getTranslations } from "next-intl/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    const tErrors = await getTranslations("apiErrors");
    if (isNaN(postId)) return NextResponse.json({ error: tErrors("invalidId") }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const { platform } = await request.json();
    if (!platform || typeof platform !== "string") {
      return NextResponse.json({ error: tErrors("platformRequired") }, { status: 400 });
    }

    const admin = createAdminClient();

    // Email verification gate
    const emailCheck = await checkEmailVerified(admin, user.id, "share");
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    // Verify post exists + private account check
    const { data: post } = await admin
      .from("posts")
      .select("id, author_id, profiles!posts_author_id_fkey(account_private)")
      .eq("id", postId)
      .single();

    if (!post) return NextResponse.json({ error: tErrors("postNotFoundShort") }, { status: 404 });
    const _a = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
    if ((_a as any)?.account_private && post.author_id !== user.id) {
      const { data: _f } = await admin.from('follows').select('id')
        .eq('follower_id', user.id).eq('following_id', post.author_id).maybeSingle();
      if (!_f) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });
    }

    // Insert into shares table — trigger updates share_count on posts
    const { error } = await admin.from("shares").insert({
      user_id: user.id,
      post_id: postId,
      platform,
    });

    if (error) {
      return NextResponse.json({ error: tErrors("serverError") }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
