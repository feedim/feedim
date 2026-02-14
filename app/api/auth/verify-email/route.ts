import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST: Verify email with OTP token (server-side verification)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== "string" || !/^\d{6,8}$/.test(token)) {
      return NextResponse.json({ error: "Geçersiz doğrulama kodu" }, { status: 400 });
    }

    // Verify OTP server-side before marking email as verified
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: user.email!,
      token,
      type: "email",
    });

    if (otpError) {
      return NextResponse.json({ error: "Kod geçersiz veya süresi dolmuş" }, { status: 400 });
    }

    // OTP verified successfully — mark email as verified
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({ email_verified: true })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Verify email error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
