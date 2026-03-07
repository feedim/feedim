import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import { verifyPuzzleToken } from "@/lib/puzzleCaptcha";
import { getUserPlan, isAdminPlan } from "@/lib/limits";

export async function POST(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    // Verify captcha token
    let captchaToken: string | undefined;
    try {
      const body = await req.json();
      captchaToken = body.captchaToken;
    } catch {}

    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!isAdminUser && (!captchaToken || !await verifyPuzzleToken(captchaToken, ip))) {
      return NextResponse.json({ error: tErrors("captchaFailed") }, { status: 403 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("status")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.status !== "frozen") {
      return NextResponse.json({ error: tErrors("accountNotFrozen") }, { status: 400 });
    }

    await admin.from("profiles").update({
      status: "active",
      frozen_at: null,
      moderation_reason: null,
    }).eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
