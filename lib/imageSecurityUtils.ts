import sharp from "sharp";
import { nanoid } from "nanoid";

// ─── Feedim File ID helpers ───

/**
 * Extract Feedim file ID from raw EXIF buffer.
 * Searches for "fdm:" prefix in IFD0.ImageDescription field.
 * Returns the ID string (without prefix) or null.
 */
export function extractFeedimId(exifBuffer: Buffer): string | null {
  // Search for "fdm:" in the raw EXIF buffer
  const marker = Buffer.from("fdm:");
  const idx = exifBuffer.indexOf(marker);
  if (idx === -1) return null;

  // Read up to 32 chars after "fdm:" (IDs are 16 chars, but be generous)
  const start = idx + marker.length;
  const end = Math.min(start + 32, exifBuffer.length);
  const slice = exifBuffer.subarray(start, end);

  // ID is alphanumeric + _ + - (nanoid charset), stop at first non-matching char or null byte
  let id = "";
  for (let i = 0; i < slice.length; i++) {
    const ch = slice[i];
    if (ch === 0) break; // null terminator
    const c = String.fromCharCode(ch);
    if (/[a-zA-Z0-9_-]/.test(c)) {
      id += c;
    } else {
      break;
    }
  }

  return id.length >= 8 ? id : null; // Minimum 8 chars for a valid ID
}

// Magic bytes — verify actual file type
const SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xFF, 0xD8, 0xFF]],
  "image/png":  [[0x89, 0x50, 0x4E, 0x47]],
  "image/gif":  [[0x47, 0x49, 0x46, 0x38]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

export function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  const sigs = SIGNATURES[declaredType];
  if (!sigs) return false;
  return sigs.some(sig => sig.every((byte, i) => buffer[i] === byte));
}

/**
 * Generate a new Feedim file ID (16-char nanoid).
 */
export function generateFeedimFileId(): string {
  return nanoid(16);
}

// Metadata strip + quality-preserving optimization
export async function stripMetadataAndOptimize(
  buffer: Buffer,
  mimeType: string,
  feedimFileId?: string,
): Promise<{ buffer: Buffer; mimeType: string }> {
  let pipeline = sharp(buffer).rotate(); // Apply EXIF rotation + strip all metadata

  // Embed Feedim file ID in EXIF (JPEG/WebP/TIFF support EXIF via withMetadata)
  if (feedimFileId && (mimeType === "image/jpeg" || mimeType === "image/webp")) {
    pipeline = pipeline.withMetadata({
      exif: {
        IFD0: {
          Software: "Feedim",
          ImageDescription: `fdm:${feedimFileId}`,
        },
      },
    });
  }

  switch (mimeType) {
    case "image/jpeg":
      pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
      break;
    case "image/png":
      pipeline = pipeline.png({ compressionLevel: 8 });
      break;
    case "image/webp":
      pipeline = pipeline.webp({ quality: 90 });
      break;
    case "image/gif":
      // GIF: sharp may lose animation — just strip metadata
      pipeline = pipeline.gif();
      break;
  }

  const result = await pipeline.toBuffer();
  return { buffer: result, mimeType };
}
