import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseMfa, getUserPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";
import { verifyEmailOtpCode } from "@/lib/supabase/verifyEmailOtp";

async function toggleMfa(userId: string, email: string, action: "enable" | "disable", code: string) {
  const admin = createAdminClient();
  const tErrors = await getTranslations("apiErrors");

  if (!/^\d{6}$/.test(code.trim())) {
    return NextResponse.json({ error: tErrors("invalidVerificationCode") }, { status: 400 });
  }

  const verified = await verifyEmailOtpCode(email, code);
  if (!verified || verified.user.id !== userId) {
    return NextResponse.json({ error: tErrors("codeInvalidOrExpired") }, { status: 400 });
  }

  if (action === "enable") {
    // MFA is premium-only, admin bypasses plan gate
    const plan = await getUserPlan(admin, userId);
    if (!canUseMfa(plan)) {
      return NextResponse.json({ error: tErrors("premiumFeatureOnly") }, { status: 403 });
    }
  }

  await admin
    .from("profiles")
    .update({ mfa_enabled: action === "enable" })
    .eq("user_id", userId);

  return NextResponse.json({ success: true });
}

// GET: Check MFA status from profiles table
export async function GET() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("mfa_enabled")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      enabled: profile?.mfa_enabled === true,
    });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}

// POST: Enable MFA (requires verified email)
export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    const code = typeof body?.code === "string" ? body.code : "";

    if (action !== "enable" && action !== "disable") {
      return NextResponse.json({ error: tErrors("invalidAction") }, { status: 400 });
    }

    return toggleMfa(user.id, user.email || "", action, code);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// DELETE: Disable MFA
export async function DELETE(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    return toggleMfa(user.id, user.email || "", "disable", code);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
