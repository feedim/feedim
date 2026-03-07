import { NextRequest, NextResponse } from "next/server";
import { verifyPuzzleToken } from "@/lib/puzzleCaptcha";

/**
 * POST /api/auth/login-check
 * Login öncesi CAPTCHA doğrulaması.
 * Bot'ların brute-force saldırısını engeller.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { captchaToken } = await request.json();

    if (!captchaToken || !(await verifyPuzzleToken(captchaToken, ip))) {
      return NextResponse.json({ error: "invalid_captcha" }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
