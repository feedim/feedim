import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { checkOtpRateLimit, recordOtpSend } from "@/lib/otpRateLimit";
import { isDisposableEmail } from "@/lib/disposableEmails";
import { verifyPuzzleToken } from "@/lib/puzzleCaptcha";
import { getTranslations } from "next-intl/server";

export async function POST(request: NextRequest) {
  try {
    const puzzleToken = request.headers.get("x-puzzle-token");
    const body = await request.json();
    const purpose = typeof body?.purpose === "string" ? body.purpose : "";
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const authClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (body.email) {
      // ─── Unauthenticated flow (forgot-password, verify-mfa) ───
      const requiresCaptcha = purpose !== "mfa";
      if (requiresCaptcha && (!puzzleToken || !(await verifyPuzzleToken(puzzleToken, ip)))) {
        return NextResponse.json({ error: "invalid_captcha" }, { status: 403 });
      }
      if (typeof body.email !== "string" || body.email.length > 255 || !body.email.includes("@")) {
        return NextResponse.json({ success: true });
      }
      const email = body.email.toLowerCase().trim();

      if (isDisposableEmail(email)) {
        return NextResponse.json({ error: "disposable_email" }, { status: 400 });
      }

      const ipCheck = await checkOtpRateLimit(`ip:${ip}`);
      if (!ipCheck.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

      const emailCheck = await checkOtpRateLimit(`email:${email}`);
      if (!emailCheck.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

      const { error: otpError } = await authClient.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (otpError) {
        return NextResponse.json({ error: "email_send_failed" }, { status: 500 });
      }

      await recordOtpSend(`email:${email}`);
      await recordOtpSend(`ip:${ip}`);
      return NextResponse.json({ success: true });
    }

    // ─── Authenticated flow (security page, unblock verify) ───
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      const tErrors = await getTranslations("apiErrors");
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }
    const email = user.email.toLowerCase();
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    const isAdminUser = profile?.role === "admin";
    const requiresCaptcha = !isAdminUser && purpose !== "mfa";
    if (requiresCaptcha && (!puzzleToken || !(await verifyPuzzleToken(puzzleToken, ip)))) {
      return NextResponse.json({ error: "invalid_captcha" }, { status: 403 });
    }

    if (!isAdminUser) {
      const ipCheck = await checkOtpRateLimit(`ip:${ip}`);
      if (!ipCheck.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

      const emailCheck = await checkOtpRateLimit(`email:${email}`);
      if (!emailCheck.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { error: otpError } = await authClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (otpError) {
      return NextResponse.json({ error: "email_send_failed" }, { status: 500 });
    }

    if (!isAdminUser) {
      await recordOtpSend(`email:${email}`);
      await recordOtpSend(`ip:${ip}`);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
