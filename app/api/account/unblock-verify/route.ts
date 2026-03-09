import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { verifyEmailOtpCode } from "@/lib/supabase/verifyEmailOtp";

export async function POST(req: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (!profile || profile.status !== "blocked") {
    return NextResponse.json({ error: tErrors("accountNotClosed") }, { status: 400 });
  }

  const { action, password, code } = await req.json();

  // Step 1: Şifre doğrulama
  if (action === "verify_password") {
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: tErrors("enterValidPassword") }, { status: 400 });
    }

    const verifyClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const { error } = await verifyClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });

    if (error) {
      return NextResponse.json({ error: tErrors("wrongPassword") }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  // Step 2: OTP doğrula ve hesabı aç
  if (action === "verify_code") {
    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: tErrors("invalidVerificationCode") }, { status: 400 });
    }

    const verified = await verifyEmailOtpCode(user.email || "", code);
    if (!verified || verified.user.id !== user.id) {
      return NextResponse.json({ error: tErrors("codeInvalidOrExpired") }, { status: 400 });
    }

    // Only allow self-unblock if not admin-blocked (has no moderation_reason from admin)
    const { data: currentProfile } = await admin.from("profiles")
      .select("moderation_reason")
      .eq("user_id", user.id)
      .single();

    // If admin set a moderation_reason, don't allow self-unblock
    if (currentProfile?.moderation_reason) {
      return NextResponse.json({ error: tErrors("accessDenied") }, { status: 403 });
    }

    await admin.from("profiles").update({
      status: "active",
      spam_score: 0,
      moderation_reason: null,
    }).eq("user_id", user.id);

    return NextResponse.json({ success: true, message: tErrors("accountUnblocked") });
  }

  return NextResponse.json({ error: tErrors("invalidAction") }, { status: 400 });
}
