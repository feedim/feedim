import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations } from "next-intl/server";
import { verifyEmailOtpCode } from "@/lib/supabase/verifyEmailOtp";

// POST: Verify OTP server-side and mark email as verified
export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code : "";
    if (!/^\d{6}$/.test(code.trim())) {
      return NextResponse.json({ error: tErrors("invalidVerificationCode") }, { status: 400 });
    }

    const verified = await verifyEmailOtpCode(user.email || "", code);
    if (!verified || verified.user.id !== user.id) {
      return NextResponse.json({ error: tErrors("codeInvalidOrExpired") }, { status: 400 });
    }

    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
