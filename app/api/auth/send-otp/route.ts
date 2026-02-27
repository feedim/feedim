import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkOtpRateLimit, recordOtpSend, cleanupOtpMap } from "@/lib/otpRateLimit";

export async function POST(request: NextRequest) {
  cleanupOtpMap();

  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    let email: string;

    if (body.email) {
      // Unauthenticated flow (forgot-password, verify-mfa)
      email = body.email.toLowerCase().trim();

      // IP rate limit for unauthenticated requests
      const ipCheck = checkOtpRateLimit(`ip:${ip}`);
      if (!ipCheck.allowed) {
        return NextResponse.json(
          { error: "rate_limited" },
          { status: 429 }
        );
      }
    } else {
      // Authenticated flow (security page, unblock verify)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      email = user.email.toLowerCase();
    }

    // Email rate limit
    const emailCheck = checkOtpRateLimit(`email:${email}`);
    if (!emailCheck.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        { status: 429 }
      );
    }

    // Send OTP via Supabase
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    // Record the attempt regardless of outcome
    recordOtpSend(`email:${email}`);
    if (body.email) recordOtpSend(`ip:${ip}`);

    if (error) {
      if (process.env.NODE_ENV === "development") console.log("OTP send error:", error.message);
      // Don't reveal if email exists or not (enumeration protection)
    }

    // Always return success (enumeration protection)
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
