import type { NSFWJS } from 'nsfwjs';

// ============================================================
// TYPES
// ============================================================

export type NsfwAction = 'allow' | 'flag';

export type NsfwContext = 'standard' | 'strict' | 'thumbnail';

export type NsfwCheckResult = {
  safe: boolean;
  action: NsfwAction;
  scores: Record<string, number>;
  reason?: string;
};

export type NsfwContentResult = {
  safe: boolean;
  action: NsfwAction;
  flaggedCount: number;
  reason?: string;
  maxScores?: Record<string, number>;
};

// ============================================================
// CONTEXT-BASED THRESHOLD PRESETS
// ============================================================

const NSFW_THRESHOLDS = {
  standard: {
    porn: 0.70, hentai: 0.70, sexy: 0.88,
    pornHentaiSum: 0.80,
    totalSum: 0.92, neutralMax: 0.15,
  },
  strict: {
    porn: 0.55, hentai: 0.55, sexy: 0.75,
    pornHentaiSum: 0.65,
    totalSum: 0.85, neutralMax: 0.30,
  },
  thumbnail: {
    porn: 0.70, hentai: 0.70, sexy: 0.88,
    pornHentaiSum: 0.80,
    totalSum: 0.92, neutralMax: 0.15,
  },
} as const;

// ============================================================
// MODEL LOADING
// ============================================================

let nsfwModel: NSFWJS | null = null;

async function loadModel(): Promise<NSFWJS> {
  if (!nsfwModel) {
    const tf = await import('@tensorflow/tfjs');
    await tf.setBackend('cpu');
    await tf.ready();
    const nsfwjs = await import('nsfwjs');
    nsfwModel = await nsfwjs.load();
  }
  return nsfwModel;
}

// ============================================================
// SCORE EVALUATION
// ============================================================

export function evaluateNsfwScores(
  scores: Record<string, number>,
  context: NsfwContext = 'standard'
): { action: NsfwAction; reason?: string } {
  const t = NSFW_THRESHOLDS[context];
  const porn = scores['Porn'] || 0;
  const hentai = scores['Hentai'] || 0;
  const sexy = scores['Sexy'] || 0;
  const neutral = scores['Neutral'] || 0;

  if (porn >= t.porn) return { action: 'flag', reason: 'Görsel: pornografi' };
  if (hentai >= t.hentai) return { action: 'flag', reason: 'Görsel: hentai' };
  if (sexy >= t.sexy) return { action: 'flag', reason: 'Görsel: erotik içerik' };
  if (porn + hentai >= t.pornHentaiSum) return { action: 'flag', reason: 'Görsel: cinsel içerik' };
  if (porn + hentai + sexy >= t.totalSum && neutral < t.neutralMax) return { action: 'flag', reason: 'Görsel: uygunsuz içerik' };

  return { action: 'allow' };
}

// ============================================================
// BUFFER → TENSOR DECODING
// ============================================================

async function decodeBufferToTensor(buffer: Buffer, mimeType: string) {
  const tf = await import('@tensorflow/tfjs');
  try {
    let width: number, height: number;
    let pixels: Uint8Array;

    const mt = mimeType.toLowerCase();

    if (mt.includes('jpeg') || mt.includes('jpg')) {
      const jpeg = await import('jpeg-js');
      const decoded = jpeg.decode(buffer, { useTArray: true });
      width = decoded.width;
      height = decoded.height;
      pixels = decoded.data as Uint8Array;
    } else if (mt.includes('png')) {
      const { PNG } = await import('pngjs');
      const png = PNG.sync.read(buffer);
      width = png.width;
      height = png.height;
      pixels = new Uint8Array(png.data);
    } else if (mt.includes('webp')) {
      const sharp = (await import('sharp')).default;
      const img = sharp(buffer, { animated: false });
      const meta = await img.metadata();
      width = meta.width || 0;
      height = meta.height || 0;
      if (!width || !height) return null;
      const raw = await img.ensureAlpha().raw().toBuffer();
      pixels = new Uint8Array(raw);
    } else if (mt.includes('gif')) {
      const { GifReader } = await import('omggif');
      const reader = new GifReader(buffer);
      width = reader.width;
      height = reader.height;
      const rgba = new Uint8Array(width * height * 4);
      reader.decodeAndBlitFrameRGBA(0, rgba);
      pixels = rgba;
    } else {
      return null;
    }

    const numPixels = width * height;
    const rgb = new Uint8Array(numPixels * 3);
    for (let i = 0; i < numPixels; i++) {
      rgb[i * 3] = pixels[i * 4];
      rgb[i * 3 + 1] = pixels[i * 4 + 1];
      rgb[i * 3 + 2] = pixels[i * 4 + 2];
    }

    return tf.tensor3d(rgb, [height, width, 3], 'int32');
  } catch {
    return null;
  }
}

// ============================================================
// BUFFER CHECK — Single image buffer
// ============================================================

export async function checkNsfwBuffer(
  buffer: Buffer,
  mimeType: string,
  context: NsfwContext = 'standard',
  opts?: { strict?: boolean }
): Promise<NsfwCheckResult> {
  try {
    const model = await loadModel();
    const tensor = await decodeBufferToTensor(buffer, mimeType);
    if (!tensor) {
      if (opts?.strict) return { safe: false, action: 'flag', scores: {}, reason: 'Görsel okunamadı (strict)' };
      return { safe: true, action: 'allow', scores: {} };
    }

    try {
      const predictions = await model.classify(tensor);
      tensor.dispose();

      const scores: Record<string, number> = {};
      for (const p of predictions) scores[p.className] = p.probability;

      const { action, reason } = evaluateNsfwScores(scores, context);
      return { safe: action === 'allow', action, scores, reason };
    } catch (err) {
      console.error('[NSFW] classify error:', err);
      tensor.dispose();
      if (opts?.strict) return { safe: false, action: 'flag', scores: {}, reason: 'Model hatası (strict)' };
      return { safe: true, action: 'allow', scores: {} };
    }
  } catch {
    if (opts?.strict) return { safe: false, action: 'flag', scores: {}, reason: 'Görsel modülü hatası' };
    return { safe: true, action: 'allow', scores: {} };
  }
}

// ============================================================
// HTML IMAGE EXTRACTION
// ============================================================

const MAX_IMAGES = 8;
const MAX_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB

interface ExtractedImage {
  type: 'base64' | 'url';
  data: string;
  mimeType: string;
}

function extractImagesFromHtml(html: string): ExtractedImage[] {
  const images: ExtractedImage[] = [];

  const b64Regex = /src="data:image\/(jpeg|jpg|png|webp|gif);base64,([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = b64Regex.exec(html)) !== null) {
    if (match[2].length > MAX_BASE64_BYTES) continue;
    images.push({ type: 'base64', data: match[2], mimeType: match[1].toLowerCase() });
    if (images.length >= MAX_IMAGES) break;
  }

  if (images.length < MAX_IMAGES) {
    const urlRegex = /<img[^>]+src="(https?:\/\/[^\"]+)"/gi;
    while ((match = urlRegex.exec(html)) !== null) {
      images.push({ type: 'url', data: match[1], mimeType: '' });
      if (images.length >= MAX_IMAGES) break;
    }
  }

  return images;
}

function getMimeFromUrl(url: string, contentType?: string): string {
  if (contentType) {
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'image/jpeg';
    if (contentType.includes('png')) return 'image/png';
    if (contentType.includes('webp')) return 'image/webp';
    if (contentType.includes('gif')) return 'image/gif';
  }
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return '';
}

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const mimeType = getMimeFromUrl(url, contentType);
    if (!mimeType) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 15 * 1024 * 1024) return null; // 15 MB cap
    return { buffer: Buffer.from(arrayBuf), mimeType };
  } catch {
    return null;
  }
}

// ============================================================
// URL CHECK — Download and check a single image URL
// ============================================================

export async function checkNsfwUrl(
  url: string,
  context: NsfwContext = 'standard'
): Promise<NsfwCheckResult | null> {
  const fetched = await fetchImageBuffer(url);
  if (!fetched) return null;
  return checkNsfwBuffer(fetched.buffer, fetched.mimeType, context);
}

// ============================================================
// CONTENT CHECK — Scan all images in HTML
// ============================================================

export async function checkNsfwContent(htmlContent: string): Promise<NsfwContentResult> {
  const images = extractImagesFromHtml(htmlContent);
  if (images.length === 0) return { safe: true, action: 'allow', flaggedCount: 0 };

  try {
    const model = await loadModel();
    let action: NsfwAction = 'allow';
    let flaggedCount = 0;
    let reason: string | undefined;
    const maxScores: Record<string, number> = { Porn: 0, Hentai: 0, Sexy: 0, Neutral: 1, Drawing: 0 };

    for (const img of images) {
      let buffer: Buffer;
      let mimeType: string;

      if (img.type === 'base64') {
        buffer = Buffer.from(img.data, 'base64');
        mimeType = img.mimeType.includes('jpg') ? 'image/jpeg' : `image/${img.mimeType}`;
      } else {
        const fetched = await fetchImageBuffer(img.data);
        if (!fetched) continue;
        buffer = fetched.buffer;
        mimeType = fetched.mimeType;
      }

      const tensor = await decodeBufferToTensor(buffer, mimeType);
      if (!tensor) continue;

      try {
        const predictions = await model.classify(tensor);
        tensor.dispose();

        const scores: Record<string, number> = {};
        for (const p of predictions) scores[p.className] = p.probability;

        for (const key of ['Porn', 'Hentai', 'Sexy', 'Drawing']) {
          if ((scores[key] || 0) > maxScores[key]) maxScores[key] = scores[key] || 0;
        }
        if ((scores['Neutral'] || 0) < maxScores['Neutral']) maxScores['Neutral'] = scores['Neutral'] || 0;

        const { action: imgAction, reason: imgReason } = evaluateNsfwScores(scores);

        if (imgAction === 'flag') {
          action = 'flag';
          flaggedCount++;
          if (!reason) reason = imgReason;
        }
      } catch {
        tensor.dispose();
      }
    }

    return { safe: action === 'allow', action, flaggedCount, reason, maxScores };
  } catch {
    return { safe: true, action: 'allow', flaggedCount: 0 };
  }
}
