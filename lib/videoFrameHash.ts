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
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
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
/**
 * Extract N evenly-spaced frames from a video as small JPEG blobs.
 * Used for server-side NSFW scanning of video content.
 *
 * Samples at 10%, 30%, 50%, 70%, 90% of duration by default.
 * Each frame is resized to maxWidth (224px) to match NSFWJS input size (~10-20KB each).
 */
export async function extractVideoFrameSamples(
  file: File,
  sampleCount = 5,
  maxWidth = 224,
): Promise<Blob[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const url = URL.createObjectURL(file);
    const blobs: Blob[] = [];
    let timestamps: number[] = [];
    let currentIdx = 0;
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(blobs);
    };

    const processNext = () => {
      if (currentIdx >= timestamps.length || settled) {
        finish();
        return;
      }
      video.currentTime = timestamps[currentIdx];
    };

    video.onseeked = () => {
      if (settled) return;
      try {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (vw === 0 || vh === 0) { currentIdx++; processNext(); return; }

        // Scale down preserving aspect ratio
        const scale = maxWidth / vw;
        const w = maxWidth;
        const h = Math.round(vh * scale);
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(video, 0, 0, w, h);

        // Check not blank
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        const isBlank = pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 0;

        if (!isBlank) {
          canvas.toBlob(
            (blob) => {
              if (blob) blobs.push(blob);
              currentIdx++;
              processNext();
            },
            'image/jpeg',
            0.8,
          );
          return;
        }
      } catch {
        // Skip frame on error
      }
      currentIdx++;
      processNext();
    };

    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration) || duration <= 0) {
        finish();
        return;
      }

      // Sample at evenly distributed points (10%, 30%, 50%, 70%, 90%)
      const count = Math.min(sampleCount, Math.max(1, Math.floor(duration)));
      timestamps = [];
      for (let i = 0; i < count; i++) {
        const pct = (2 * i + 1) / (2 * count); // centers: 0.1, 0.3, 0.5, 0.7, 0.9 for count=5
        timestamps.push(duration * pct);
      }

      processNext();
    };

    video.onerror = () => finish();

    // Timeout: 30s max for frame sampling
    setTimeout(() => finish(), 30000);

    video.src = url;
    video.load();
  });
}

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
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // Intermediate canvas for center-crop
    const cropCanvas = document.createElement('canvas');
    const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })!;

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
