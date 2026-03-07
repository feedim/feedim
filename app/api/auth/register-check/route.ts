import { NextRequest, NextResponse } from "next/server";
import { checkRegistrationLimit } from "@/lib/registrationRateLimit";
import { verifyPuzzleToken } from "@/lib/puzzleCaptcha";
import { createRegistrationProof } from "@/lib/registrationProof";

/**
 * POST /api/auth/register-check
 * Kayıt öncesi CAPTCHA + IP + cihaz limiti kontrolü.
 * Başarılıysa auto-confirm için kısa ömürlü, tek kullanımlık proof üretir.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const body = await request.json().catch(() => ({}));
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken : "";
    const deviceHash = typeof body.deviceHash === "string" ? body.deviceHash : undefined;

    if (!captchaToken || !(await verifyPuzzleToken(captchaToken, ip))) {
      return NextResponse.json({ error: "invalid_captcha" }, { status: 403 });
    }

    const { allowed, reason } = await checkRegistrationLimit(ip, deviceHash);
    if (!allowed) {
      return NextResponse.json(
        { error: "registration_limit", reason },
        { status: 429 }
      );
    }

    const registrationProof = createRegistrationProof(ip, deviceHash);
    return NextResponse.json({ allowed: true, registrationProof });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
