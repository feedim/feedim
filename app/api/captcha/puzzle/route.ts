import { NextRequest, NextResponse } from "next/server";
import {
  generatePuzzleImages,
  encryptChallenge,
  decryptChallenge,
  validatePuzzleSubmission,
} from "@/lib/puzzleCaptcha";
import {
  isIpLocked,
  recordFailure,
  recordSuccess,
  isNonceUsed,
  markNonceUsed,
} from "@/lib/captchaRateLimit";
import { randomUUID } from "crypto";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);

  const lockStatus = await isIpLocked(ip);
  if (lockStatus.locked) {
    return NextResponse.json(
      { error: "rate_limited", retryAfter: lockStatus.retryAfter },
      { status: 429 }
    );
  }

  try {
    const { bgBase64, pieceBase64, targetX, targetY } = await generatePuzzleImages(300, 175, 44);

    const token = encryptChallenge({
      px: targetX,
      py: targetY,
      iat: Date.now(),
      nonce: randomUUID(),
    });

    return NextResponse.json({
      challengeToken: token,
      bgImage: `data:image/jpeg;base64,${bgBase64}`,
      pieceImage: `data:image/png;base64,${pieceBase64}`,
      pieceY: targetY,
      canvasWidth: 300,
      canvasHeight: 175,
      pieceSize: 44,
    });
  } catch {
    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const lockStatus = await isIpLocked(ip);
  if (lockStatus.locked) {
    return NextResponse.json(
      { success: false, error: "rate_limited", retryAfter: lockStatus.retryAfter },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { challengeToken, userX, trail, duration } = body;

    if (!challengeToken || typeof userX !== "number") {
      await recordFailure(ip);
      return NextResponse.json({ success: false, error: "invalid_request" }, { status: 400 });
    }

    // 1. Decrypt challenge FIRST to check nonce before any validation
    const challenge = decryptChallenge(challengeToken);
    if (!challenge) {
      await recordFailure(ip);
      return NextResponse.json({ success: false, error: "invalid_token" }, { status: 400 });
    }

    // 2. Nonce replay check — BEFORE validation (prevents brute-force position guessing)
    if (await isNonceUsed(challenge.nonce)) {
      await recordFailure(ip);
      return NextResponse.json(
        { success: false, error: "replay_detected" },
        { status: 400 }
      );
    }
    // Mark nonce as used immediately — this token can never be submitted again
    await markNonceUsed(challenge.nonce);

    // 3. Now validate (position, trail, timing)
    const result = validatePuzzleSubmission(challengeToken, userX, trail || [], duration || 0, ip);

    if (!result.success) {
      await recordFailure(ip);

      const newLockStatus = await isIpLocked(ip);
      const status = result.error === "expired" ? 410 : newLockStatus.locked ? 429 : 200;
      return NextResponse.json(
        {
          success: false,
          error: newLockStatus.locked ? "rate_limited" : result.error,
          accuracy: result.accuracy,
          retryAfter: newLockStatus.retryAfter,
        },
        { status }
      );
    }

    // Success — reset failure counter
    await recordSuccess(ip);

    return NextResponse.json({ success: true, token: result.token, accuracy: result.accuracy });
  } catch {
    await recordFailure(ip);
    return NextResponse.json({ success: false, error: "verification_failed" }, { status: 500 });
  }
}
