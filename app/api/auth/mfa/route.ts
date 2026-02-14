import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Check MFA status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) throw error;

    const totpFactors = data?.totp || [];
    const verified = totpFactors.filter((f: any) => f.status === "verified");

    return NextResponse.json({
      enabled: verified.length > 0,
      factors: totpFactors.map((f: any) => ({
        id: f.id,
        status: f.status,
        friendly_name: f.friendly_name,
      })),
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("MFA status error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST: Enroll or verify MFA
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, factorId, code } = body;

    if (action === "enroll") {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });
      if (error) throw error;

      return NextResponse.json({
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    }

    if (action === "verify") {
      if (!factorId || !code) {
        return NextResponse.json({ error: "Factor ID ve doğrulama kodu gerekli" }, { status: 400 });
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verify.error) {
        return NextResponse.json({ error: "Doğrulama kodu yanlış" }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("MFA error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}

// DELETE: Unenroll MFA factor
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { factorId } = body;

    if (!factorId) {
      return NextResponse.json({ error: "Factor ID gerekli" }, { status: 400 });
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("MFA unenroll error:", error);
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
}
