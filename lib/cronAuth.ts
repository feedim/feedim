import { NextRequest } from "next/server";
import crypto from "crypto";

/**
 * Verify cron secret using timing-safe comparison to prevent timing attacks.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  if (authHeader.length !== expected.length) return false;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
