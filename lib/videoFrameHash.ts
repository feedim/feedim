/**
 * Client-side video frame extraction + aHash computation.
 * Uses canvas API to extract frames from video files and compute
 * perceptual hashes (average hash) for copyright detection.
 *
 * aHash is used instead of dHash because it's significantly more robust
 * to video re-encoding, resolution changes, and codec differences.
 * Center-crop is applied before hashing to normalize aspect ratios.
 */

export interface ClientFrameHash {
  frameIndex: number;
  hash: string;
  timestamp: number;
}

/**
 * Compute aHash (average hash) from an 8×8 canvas.
 * Pixels above the mean → 1, below → 0. 64-bit hash → 16-hex string.
 * More robust to re-encoding than dHash because it uses a global threshold.
 */
function computeAHash(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, 8, 8);
  const pixels = imageData.data;

  // Convert to grayscale
  const gray: number[] = [];
  for (let i = 0; i < 64; i++) {
    gray.push(
      Math.round(0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2])
    );
  }

  // Compute mean
  let sum = 0;
  for (let i = 0; i < 64; i++) sum += gray[i];
  const mean = sum / 64;

  // Pixels >= mean → 1, else → 0
  let hash = BigInt(0);
  for (let i = 0; i < 64; i++) {
    if (gray[i] >= mean) {
      hash |= BigInt(1) << BigInt(i);
    }
  }

  return hash.toString(16).padStart(16, '0');
}

/**
 * Extract video frame hashes from a File object.
 * For each second: center-crop → 8×8 canvas → aHash.
 * Center-crop normalizes different aspect ratios so the same content
 * produces consistent hashes regardless of resolution.
 *
 * @param file - Video file to extract frames from
 * @param maxFrames - Maximum number of frames to extract (default: 300 = 5 min)
 * @returns Array of frame hashes with index and timestamp
 */
export async function extractVideoFrameHashes(
  file: File,
  maxFrames = 300,
): Promise<ClientFrameHash[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    // 8×8 canvas for aHash
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d')!;

    // Intermediate canvas for center-crop
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d')!;

    const url = URL.createObjectURL(file);
    const hashes: ClientFrameHash[] = [];
    let currentFrame = 0;
    let totalFrames = 0;
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(hashes);
    };

    const processNextFrame = () => {
      if (currentFrame >= totalFrames || settled) {
        finish();
        return;
      }

      const timestamp = currentFrame;
      video.currentTime = timestamp;
    };

    video.onseeked = () => {
      if (settled) return;

      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Center-crop: extract the largest centered square
        const size = Math.min(vw, vh);
        const sx = Math.floor((vw - size) / 2);
        const sy = Math.floor((vh - size) / 2);

        // Draw center-cropped frame directly to 8×8 canvas
        ctx.drawImage(video, sx, sy, size, size, 0, 0, 8, 8);

        // Check not blank
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        const isBlank = pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0;

        if (!isBlank) {
          const hash = computeAHash(canvas);
          hashes.push({
            frameIndex: currentFrame,
            hash,
            timestamp: currentFrame,
          });
        }
      } catch {
        // Skip frame on error
      }

      currentFrame++;
      processNextFrame();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration <= 0) {
        finish();
        return;
      }

      totalFrames = Math.min(Math.floor(duration), maxFrames);
      if (totalFrames === 0) {
        finish();
        return;
      }

      processNextFrame();
    };

    video.onerror = () => finish();

    // Timeout: 60s max for frame extraction
    setTimeout(() => finish(), 60000);

    video.src = url;
    video.load();
  });
}
