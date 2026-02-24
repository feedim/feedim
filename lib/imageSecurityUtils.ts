import sharp from "sharp";

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

// Metadata strip + quality-preserving optimization
export async function stripMetadataAndOptimize(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  let pipeline = sharp(buffer).rotate(); // Apply EXIF rotation + strip all metadata

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
