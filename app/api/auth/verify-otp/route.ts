import { NextRequest, NextResponse } from "next/server";
import { checkOtpRateLimit, recordOtpSend } from "@/lib/otpRateLimit";
import { verifyEmailOtpCode } from "@/lib/supabase/verifyEmailOtp";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    if (!email || !code || typeof code !== "string") {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.replace(/\s+/g, "").trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      return NextResponse.json({ error: "invalid_params" }, { status: 400 });
    }

    const ipKey = `verify:ip:${ip}`;
    const emailKey = `verify:email:${normalizedEmail}`;
    const [ipCheck, emailCheck] = await Promise.all([
      checkOtpRateLimit(ipKey),
      checkOtpRateLimit(emailKey),
    ]);
    if (!ipCheck.allowed || !emailCheck.allowed) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const result = await verifyEmailOtpCode(normalizedEmail, normalizedCode);
    await Promise.all([recordOtpSend(ipKey), recordOtpSend(emailKey)]);

    if (result) {
      return NextResponse.json({
        success: true,
        ...(result.session && {
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        }),
      });
    }

    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
