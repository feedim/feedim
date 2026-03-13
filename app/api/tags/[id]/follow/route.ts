import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cache } from "@/lib/cache";
import { safeError } from "@/lib/apiError";
import { checkEmailVerified } from "@/lib/emailGate";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MAX_TAG_FOLLOWS = 10;

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tagId = parseInt(id);
    const tErrors = await getTranslations("apiErrors");
    if (isNaN(tagId)) return NextResponse.json({ error: tErrors("invalidId") }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    // Email verification check
    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);
    const emailCheck = await checkEmailVerified(admin, user.id, "tag_follow");
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    // Check if already following
    const { data: existing } = await admin
      .from("tag_follows")
      .select("tag_id")
      .eq("user_id", user.id)
      .eq("tag_id", tagId)
      .single();

    if (existing) {
      // Unfollow
      await admin
        .from("tag_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("tag_id", tagId);
      cache.delete(`user:${user.id}:tag-follows`);
      return NextResponse.json({ following: false });
    }

    // Check max limit
    const { count } = await admin
      .from("tag_follows")
      .select("tag_id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!isAdminUser && count && count >= MAX_TAG_FOLLOWS) {
      return NextResponse.json({ error: tErrors("maxTagFollows", { max: MAX_TAG_FOLLOWS }) }, { status: 400 });
    }

    // Follow
    const { error } = await admin
      .from("tag_follows")
      .insert({ user_id: user.id, tag_id: tagId });

    if (error) return safeError(error);

    cache.delete(`user:${user.id}:tag-follows`);
    return NextResponse.json({ following: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
