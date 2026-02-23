/**
 * Client-side audio fingerprinting for video copyright detection.
 * Extracts audio from video files using Web Audio API and computes
 * perceptual fingerprints (energy-based aHash) per second.
 *
 * Algorithm:
 * 1. Decode audio to mono, downsample to 5512 Hz
 * 2. Split into 1-second chunks (5512 samples each)
 * 3. Each chunk → 64 sub-segments → RMS energy per segment
 * 4. Above mean energy → 1, below → 0 → 64-bit hash
 * 5. Same format as video aHash → same Hamming comparison
 *
 * Robust to: volume changes, re-encoding, codec differences, sample rate changes.
 */

export interface AudioChunkHash {
  chunkIndex: number;
  hash: string;
}

/**
 * Extract audio fingerprint hashes from a video or audio File.
 * Uses OfflineAudioContext for fast offline processing.
 *
 * @param file - Video or audio file
 * @param maxChunks - Maximum seconds to fingerprint (default: 300 = 5 min)
 * @returns Array of per-second audio hashes (64-bit, 16-hex format)
 */
export async function extractAudioFingerprint(
  file: File,
  maxChunks = 300,
): Promise<AudioChunkHash[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Decode audio at 5512 Hz mono for compact fingerprinting
    const targetSampleRate = 5512;
    const audioContext = new OfflineAudioContext(1, 1, targetSampleRate);

    let decodedBuffer: AudioBuffer;
    try {
      decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      // Some browsers need original sample rate first
      const tempCtx = new AudioContext();
      decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
      await tempCtx.close();
    }

    // Resample to target rate using OfflineAudioContext
    const duration = decodedBuffer.duration;
    const totalSamples = Math.ceil(duration * targetSampleRate);
    const offlineCtx = new OfflineAudioContext(1, totalSamples, targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const resampledBuffer = await offlineCtx.startRendering();
    const samples = resampledBuffer.getChannelData(0);

    // Split into 1-second chunks and compute fingerprint
    const samplesPerChunk = targetSampleRate; // 5512 samples = 1 second
    const totalChunks = Math.min(Math.floor(samples.length / samplesPerChunk), maxChunks);
    const hashes: AudioChunkHash[] = [];

    for (let chunk = 0; chunk < totalChunks; chunk++) {
      const start = chunk * samplesPerChunk;
      const chunkSamples = samples.slice(start, start + samplesPerChunk);

      const hash = computeAudioAHash(chunkSamples);

      // Skip silent chunks (all zeros = no audio)
      if (hash !== '0000000000000000') {
        hashes.push({
          chunkIndex: chunk,
          hash,
        });
      }
    }

    return hashes;
  } catch (err) {
    console.error('[AudioFingerprint] Extraction failed:', err);
    return [];
  }
}

/**
 * Compute audio aHash from a 1-second audio chunk.
 * Splits into 64 sub-segments, computes RMS energy per segment,
 * then applies average hash: above mean → 1, below → 0.
 * Returns 64-bit hash as 16-hex string.
 */
function computeAudioAHash(samples: Float32Array): string {
  const segmentCount = 64;
  const segmentSize = Math.floor(samples.length / segmentCount);
  if (segmentSize === 0) return '0000000000000000';

  // Compute RMS energy for each sub-segment
  const energies: number[] = [];
  for (let i = 0; i < segmentCount; i++) {
    const start = i * segmentSize;
    const end = start + segmentSize;
    let sumSquares = 0;
    for (let j = start; j < end; j++) {
      sumSquares += samples[j] * samples[j];
    }
    energies.push(Math.sqrt(sumSquares / segmentSize));
  }

  // Compute mean energy
  let sum = 0;
  for (let i = 0; i < segmentCount; i++) sum += energies[i];
  const mean = sum / segmentCount;

  // Hash: segments above mean → 1, below → 0
  let hash = BigInt(0);
  for (let i = 0; i < segmentCount; i++) {
    if (energies[i] >= mean) {
      hash |= BigInt(1) << BigInt(i);
    }
  }

  return hash.toString(16).padStart(16, '0');
}
