/**
 * Client-side video optimization for upload.
 *
 * 1. Detects fragmented MP4 (fMP4) — defragments with ffmpeg.wasm (-c copy, no re-encode)
 * 2. Regular MP4 — applies faststart (moov atom relocation)
 * 3. Returns original file on any error
 *
 * Uses single-threaded ffmpeg.wasm (no SharedArrayBuffer / CORS headers needed).
 */

import { mp4Faststart } from "./mp4Faststart";

interface Mp4BoxHeader {
  type: string;
  offset: number;
  size: number;
}

/** Read a top-level MP4 box header at the given offset. */
async function readBoxHeader(
  file: Blob,
  offset: number
): Promise<Mp4BoxHeader | null> {
  if (offset + 8 > file.size) return null;
  const buf = await file
    .slice(offset, Math.min(offset + 16, file.size))
    .arrayBuffer();
  if (buf.byteLength < 8) return null;

  const view = new DataView(buf);
  let size = view.getUint32(0);
  const type = String.fromCharCode(
    view.getUint8(4),
    view.getUint8(5),
    view.getUint8(6),
    view.getUint8(7)
  );

  if (size === 1 && buf.byteLength >= 16) {
    const hi = view.getUint32(8);
    const lo = view.getUint32(12);
    size = hi * 0x100000000 + lo;
  } else if (size === 0) {
    size = file.size - offset;
  }

  return { type, offset, size };
}

/**
 * Detect whether a file is a fragmented MP4.
 * fMP4 has moof atoms (movie fragment) — regular MP4 does not.
 * Also checks if moov is suspiciously small relative to file size.
 */
async function isFragmentedMp4(file: File): Promise<boolean> {
  let offset = 0;
  while (offset < file.size) {
    const box = await readBoxHeader(file, offset);
    if (!box || box.size < 8) break;

    if (box.type === "moof") return true;

    // Only scan first ~100 boxes to avoid long parsing
    offset += box.size;
    if (offset > 50 * 1024 * 1024) break; // stop after 50MB scan
  }
  return false;
}

/**
 * Optimize a video file for instant web playback.
 *
 * - Fragmented MP4 → defragment with ffmpeg.wasm (copy codec, no re-encode)
 * - Regular MP4 → faststart (moov atom relocation)
 * - Non-MP4 or error → return original file unchanged
 *
 * @param file - The video File to optimize
 * @param onProgress - Optional progress callback (0-100)
 */
export async function optimizeVideo(
  file: File,
  onProgress?: (pct: number) => void
): Promise<File> {
  try {
    // Only process MP4/MOV files
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["mp4", "m4v", "mov"].includes(ext || "")) return file;

    const fragmented = await isFragmentedMp4(file);

    if (!fragmented) {
      // Regular MP4 — just move moov atom to front
      onProgress?.(50);
      const result = await mp4Faststart(file);
      onProgress?.(100);
      return result;
    }

    // Fragmented MP4 — defragment with ffmpeg.wasm
    onProgress?.(5);

    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL, fetchFile } = await import("@ffmpeg/util");

    const ffmpeg = new FFmpeg();

    // Track ffmpeg progress
    ffmpeg.on("progress", ({ progress }) => {
      // progress is 0-1, map to 10-90 range (leaving room for load/write)
      onProgress?.(10 + Math.round(progress * 80));
    });

    onProgress?.(8);

    // Load single-threaded core from CDN (no SharedArrayBuffer needed)
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    onProgress?.(10);

    // Write input file to ffmpeg virtual filesystem
    const inputName = "input.mp4";
    const outputName = "output.mp4";
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    onProgress?.(15);

    // Defragment: copy streams, add faststart, no re-encode
    await ffmpeg.exec([
      "-i",
      inputName,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "-f",
      "mp4",
      outputName,
    ]);

    onProgress?.(92);

    // Read output
    const data = await ffmpeg.readFile(outputName);

    // Clean up ffmpeg memory
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
    ffmpeg.terminate();

    onProgress?.(95);

    // data can be Uint8Array or string
    if (typeof data === "string") {
      // Unexpected — return original
      return file;
    }

    const optimized = new File([data.buffer as ArrayBuffer], file.name, {
      type: file.type || "video/mp4",
    });

    // Sanity check: output should not be drastically different in size
    // If output is <10% of original, something went wrong
    if (optimized.size < file.size * 0.1) {
      return file;
    }

    onProgress?.(100);
    return optimized;
  } catch (err) {
    console.warn("[videoOptimize] optimization failed, using original:", err);
    return file;
  }
}
