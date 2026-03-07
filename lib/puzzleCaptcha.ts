import sharp from "sharp";
import { randomUUID, createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { isNonceUsed, markNonceUsed } from "@/lib/captchaRateLimit";

// ─── Config ────────────────────────────────────────────────────────
const DEV_FALLBACK = "dev_puzzle_captcha_secret_32b!"; // 32 chars, dev only

function getSecret(): string {
  const secret = process.env.PUZZLE_CAPTCHA_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("PUZZLE_CAPTCHA_SECRET environment variable is required in production");
  }
  return secret || DEV_FALLBACK;
}

function getKey(): Buffer {
  return Buffer.from(getSecret().padEnd(32, "0").slice(0, 32), "utf8");
}

const TOLERANCE_PX = 15;
const CHALLENGE_TTL = 120_000; // 2 min
const VERIFY_TTL = 300_000;    // 5 min
const MIN_DURATION = 200;      // ms
const MAX_DURATION = 60_000;   // ms
const MIN_TRAIL_POINTS = 5;

// ─── Image Generation ──────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomColor(): string {
  const r = randomInt(40, 200);
  const g = randomInt(40, 200);
  const b = randomInt(40, 200);
  return `rgb(${r},${g},${b})`;
}

function generateBackgroundSvg(w: number, h: number): string {
  const c1 = randomColor();
  const c2 = randomColor();
  const angle = randomInt(0, 360);

  let shapes = "";
  const shapeCount = randomInt(8, 16);
  for (let i = 0; i < shapeCount; i++) {
    const opacity = (Math.random() * 0.35 + 0.1).toFixed(2);
    const fill = randomColor();
    if (Math.random() > 0.5) {
      const cx = randomInt(0, w);
      const cy = randomInt(0, h);
      const r = randomInt(10, 50);
      shapes += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
    } else {
      const rx = randomInt(0, w);
      const ry = randomInt(0, h);
      const rw = randomInt(15, 60);
      const rh = randomInt(15, 60);
      shapes += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" opacity="${opacity}" rx="4"/>`;
    }
  }

  for (let i = 0; i < 4; i++) {
    const x1 = randomInt(0, w);
    const y1 = randomInt(0, h);
    const x2 = randomInt(0, w);
    const y2 = randomInt(0, h);
    const stroke = randomColor();
    const opacity = (Math.random() * 0.3 + 0.1).toFixed(2);
    shapes += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${randomInt(1, 3)}" opacity="${opacity}"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" gradientTransform="rotate(${angle})">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${shapes}
  </svg>`;
}

// ─── Puzzle Shapes ───────────────────────────────────────────────

type PuzzleShape = "roundedRect" | "circle" | "jigsaw" | "pentagon" | "star" | "triangle";

// Weighted pool — star is rarest
const SHAPE_POOL: PuzzleShape[] = [
  "roundedRect", "roundedRect",
  "circle", "circle",
  "jigsaw", "jigsaw",
  "pentagon",
  "triangle", "triangle",
  "star", // rarest — hardest to align
];

function pickShape(): PuzzleShape {
  return SHAPE_POOL[randomInt(0, SHAPE_POOL.length - 1)];
}

/** Returns an SVG shape string that fits strictly within 0,0 → size,size */
function shapePath(size: number, shape: PuzzleShape): string {
  const s = size;
  const half = s / 2;
  const m = 2; // margin from edges
  switch (shape) {
    case "circle":
      return `<circle cx="${half}" cy="${half}" r="${half - m}" fill="white"/>`;
    case "jigsaw": {
      // Jigsaw with inset notches (all within bounds)
      const notch = s * 0.12;
      const r = 5;
      const d = [
        `M ${r} ${m}`,
        `H ${s * 0.35}`,
        `C ${s * 0.35} ${m + notch * 2}, ${s * 0.65} ${m + notch * 2}, ${s * 0.65} ${m}`,
        `H ${s - r}`,
        `Q ${s - m} ${m} ${s - m} ${r}`,
        `V ${s * 0.35}`,
        `C ${s - m - notch * 2} ${s * 0.35}, ${s - m - notch * 2} ${s * 0.65}, ${s - m} ${s * 0.65}`,
        `V ${s - r}`,
        `Q ${s - m} ${s - m} ${s - r} ${s - m}`,
        `H ${r}`,
        `Q ${m} ${s - m} ${m} ${s - r}`,
        `V ${r}`,
        `Q ${m} ${m} ${r} ${m}`,
        `Z`,
      ].join(" ");
      return `<path d="${d}" fill="white"/>`;
    }
    case "pentagon": {
      const cx = half, cy = half;
      const radius = half - m;
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
      }
      return `<polygon points="${pts.join(" ")}" fill="white"/>`;
    }
    case "star": {
      const cx = half, cy = half;
      const outerR = half - m;
      const innerR = outerR * 0.45;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const rad = i % 2 === 0 ? outerR : innerR;
        pts.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
      }
      return `<polygon points="${pts.join(" ")}" fill="white"/>`;
    }
    case "triangle": {
      const pts = `${half},${m} ${s - m},${s - m} ${m},${s - m}`;
      return `<polygon points="${pts}" fill="white"/>`;
    }
    case "roundedRect":
    default:
      return `<rect x="${m}" y="${m}" width="${s - m * 2}" height="${s - m * 2}" rx="6" ry="6" fill="white"/>`;
  }
}

// Full canvas-size SVG so sharp composite aligns pixel-perfect
function holeOverlaySvg(px: number, py: number, size: number, canvasW: number, canvasH: number, shape: PuzzleShape): string {
  // Reuse the shape path but translate to (px, py) and use hole styling
  const shapeEl = shapePath(size, shape)
    .replace(/fill="white"/g, 'fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.7)" stroke-width="2"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">
    <g transform="translate(${px},${py})">${shapeEl}</g>
  </svg>`;
}

function maskSvg(size: number, shape: PuzzleShape): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${shapePath(size, shape)}
  </svg>`;
}

export async function generatePuzzleImages(
  canvasW = 300,
  canvasH = 175,
  pieceSize = 44
): Promise<{ bgBase64: string; pieceBase64: string; targetX: number; targetY: number }> {
  // Random puzzle position (keep away from edges)
  const targetX = randomInt(80, canvasW - pieceSize - 20);
  const targetY = randomInt(20, canvasH - pieceSize - 20);
  const shape = pickShape();

  // 1. Generate background
  const bgSvg = generateBackgroundSvg(canvasW, canvasH);
  const bgBuffer = await sharp(Buffer.from(bgSvg)).jpeg({ quality: 80 }).toBuffer();

  // 2. Extract puzzle piece from background (before adding hole)
  const fullBg = await sharp(Buffer.from(bgSvg)).png().toBuffer();
  const mask = Buffer.from(maskSvg(pieceSize, shape));

  const pieceBuffer = await sharp(fullBg)
    .extract({ left: targetX, top: targetY, width: pieceSize, height: pieceSize })
    .composite([
      { input: mask, blend: "dest-in" },
    ])
    .png()
    .toBuffer();

  // 3. Add hole overlay to background
  const holeSvg = holeOverlaySvg(targetX, targetY, pieceSize, canvasW, canvasH, shape);
  const bgWithHole = await sharp(bgBuffer)
    .composite([{ input: Buffer.from(holeSvg), blend: "over" }])
    .jpeg({ quality: 80 })
    .toBuffer();

  return {
    bgBase64: bgWithHole.toString("base64"),
    pieceBase64: pieceBuffer.toString("base64"),
    targetX,
    targetY,
  };
}

// ─── Encryption ────────────────────────────────────────────────────

interface ChallengePayload {
  px: number;
  py: number;
  iat: number;
  nonce: string;
}

export function encryptChallenge(payload: ChallengePayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv(12) + tag(16) + encrypted
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptChallenge(token: string): ChallengePayload | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch {
    return null;
  }
}

// ─── Trail Analysis ────────────────────────────────────────────────

interface TrailPoint {
  x: number;
  t: number;
}

export function analyzeTrail(trail: TrailPoint[], duration: number): boolean {
  // Duration check — only reject extremes
  if (duration < MIN_DURATION || duration > MAX_DURATION) return false;

  // Minimum trail points
  if (!trail || trail.length < MIN_TRAIL_POINTS) return false;

  // Timestamps must be non-negative and roughly increasing
  for (let i = 1; i < trail.length; i++) {
    if (trail[i].t < trail[i - 1].t - 5) return false; // allow tiny jitter
  }

  // Speed variation — only catch perfectly robotic movement
  const speeds: number[] = [];
  for (let i = 1; i < trail.length; i++) {
    const dt = trail[i].t - trail[i - 1].t;
    const dx = Math.abs(trail[i].x - trail[i - 1].x);
    if (dt > 0) speeds.push(dx / dt);
  }

  // Need at least a few speed samples
  if (speeds.length < 2) return false;

  const meanSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  // If all speeds are exactly zero (didn't move at all), reject
  if (meanSpeed === 0) return false;

  // Only reject if speed is PERFECTLY constant (cv < 0.01) — extremely robotic
  if (speeds.length >= 4) {
    const speedVariance = speeds.reduce((a, s) => a + (s - meanSpeed) ** 2, 0) / speeds.length;
    const cv = Math.sqrt(speedVariance) / meanSpeed;
    if (cv < 0.01) return false;
  }

  return true;
}

// ─── Verify Token (HMAC, tek kullanımlık) ────────────────────────

export function createVerifyToken(ip: string): string {
  const payload = {
    v: true,
    iat: Date.now(),
    nonce: randomUUID(),
    ip,
  };
  const json = JSON.stringify(payload);
  const sig = createHmac("sha256", getKey()).update(json).digest("base64url");
  const data = Buffer.from(json).toString("base64url");
  return `${data}.${sig}`;
}

export async function verifyPuzzleToken(token: string, ip: string): Promise<boolean> {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return false;

    const json = Buffer.from(data, "base64url").toString("utf8");
    const expectedSig = createHmac("sha256", getKey()).update(json).digest("base64url");

    // Timing-safe karşılaştırma — zamanlama saldırısını engeller
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

    const payload = JSON.parse(json);
    if (!payload.v) return false;
    if (Date.now() - payload.iat > VERIFY_TTL) return false;

    // IP eşleşme kontrolü — token farklı IP'den kullanılamaz
    if (payload.ip !== ip) return false;

    // Nonce tek kullanım kontrolü — Redis destekli (multi-instance safe)
    // TTL, verify token ömründen uzun olmalı (VERIFY_TTL + 10s) — erken silme replay açığı oluşturur
    if (!payload.nonce || await isNonceUsed(payload.nonce)) return false;
    await markNonceUsed(payload.nonce, VERIFY_TTL + 10_000);

    return true;
  } catch {
    return false;
  }
}

// ─── Validation Helper (used by POST) ──────────────────────────────

export function validatePuzzleSubmission(
  challengeToken: string,
  userX: number,
  trail: TrailPoint[],
  duration: number,
  ip: string
): { success: boolean; error?: string; token?: string; accuracy?: number } {
  // Decrypt challenge
  const challenge = decryptChallenge(challengeToken);
  if (!challenge) return { success: false, error: "invalid_token" };

  // TTL check
  if (Date.now() - challenge.iat > CHALLENGE_TTL) return { success: false, error: "expired" };

  // Calculate accuracy (0–100%)
  const diff = Math.abs(userX - challenge.px);
  const accuracy = Math.max(0, Math.round((1 - diff / TOLERANCE_PX) * 100));

  // Position check
  if (diff > TOLERANCE_PX) return { success: false, error: "position_mismatch", accuracy };

  // Trail analysis
  if (!analyzeTrail(trail, duration)) return { success: false, error: "behavior_rejected", accuracy };

  // All checks passed
  return { success: true, token: createVerifyToken(ip), accuracy };
}
