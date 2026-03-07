import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { isNonceUsed, markNonceUsed } from "@/lib/captchaRateLimit";

const DEV_FALLBACK = "dev_puzzle_captcha_secret_32b!";

function getSecret(): string {
  const secret = process.env.PUZZLE_CAPTCHA_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("PUZZLE_CAPTCHA_SECRET environment variable is required in production");
  }
  return secret || DEV_FALLBACK;
}
const PROOF_TTL_MS = 120_000;

interface RegistrationProofPayload {
  iat: number;
  nonce: string;
  ip: string;
  deviceHash?: string;
}

function signPayload(payload: RegistrationProofPayload): string {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function parseAndVerify(token: string): RegistrationProofPayload | null {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expectedSig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(data, "base64url").toString("utf8");
    return JSON.parse(json) as RegistrationProofPayload;
  } catch {
    return null;
  }
}

export function createRegistrationProof(ip: string, deviceHash?: string): string {
  return signPayload({
    iat: Date.now(),
    nonce: randomUUID(),
    ip,
    ...(deviceHash ? { deviceHash } : {}),
  });
}

export async function verifyRegistrationProof(
  token: string,
  ip: string,
  deviceHash?: string
): Promise<boolean> {
  const payload = parseAndVerify(token);
  if (!payload) return false;

  if (Date.now() - payload.iat > PROOF_TTL_MS) return false;
  if (payload.ip !== ip) return false;

  if (payload.deviceHash) {
    if (!deviceHash || payload.deviceHash !== deviceHash) return false;
  }

  if (!payload.nonce || (await isNonceUsed(payload.nonce))) return false;
  await markNonceUsed(payload.nonce, PROOF_TTL_MS + 10_000);
  return true;
}
