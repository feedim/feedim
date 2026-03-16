/**
 * Server-side video transcoding engine.
 *
 * Converts any video format to optimized H.264/AAC MP4.
 * Smart detection: skip if already optimal, remux if codec is fine but container isn't,
 * full transcode only when necessary.
 *
 * YouTube-like settings: CRF-based quality, yuv420p, faststart, high profile.
 */

import { createWriteStream, createReadStream, statSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

interface ProbeResult {
  videoCodec: string | null;
  audioCodec: string | null;
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  container: string;
  pixelFormat: string | null;
  fps: number;
  audioSampleRate: number;
  audioBitrate: number;
  audioChannels: number;
}

export interface TranscodeOptions {
  contentType: "video" | "moment";
  maxWidth?: number;
  maxHeight?: number;
}

export interface TranscodeResult {
  outputPath: string;
  contentType: string;
  probeInfo: ProbeResult;
  action: "transcoded" | "remuxed" | "optimized" | "passthrough";
  inputSize: number;
  outputSize: number;
}

const TRANSCODE_DIR = join(tmpdir(), "feedim-transcode");

function ensureDir() {
  if (!existsSync(TRANSCODE_DIR)) mkdirSync(TRANSCODE_DIR, { recursive: true });
}

function tempPath(ext: string): string {
  ensureDir();
  return join(TRANSCODE_DIR, `${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`);
}

export function cleanupFile(filePath: string) {
  try { if (existsSync(filePath)) unlinkSync(filePath); } catch {}
}

// ─── Probe ───

export async function probeVideo(filePath: string): Promise<ProbeResult> {
  const ffmpeg = await import("fluent-ffmpeg");

  return new Promise((resolve, reject) => {
    ffmpeg.default.ffprobe(filePath, (err: Error | null, data: any) => {
      if (err) return reject(err);

      const videoStream = data.streams?.find((s: any) => s.codec_type === "video");
      const audioStream = data.streams?.find((s: any) => s.codec_type === "audio");
      const format = data.format || {};

      resolve({
        videoCodec: videoStream?.codec_name || null,
        audioCodec: audioStream?.codec_name || null,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        duration: parseFloat(format.duration) || 0,
        bitrate: parseInt(format.bit_rate) || 0,
        container: format.format_name || "",
        pixelFormat: videoStream?.pix_fmt || null,
        fps: parseFloat(videoStream?.r_frame_rate?.split("/").reduce((a: string, b: string) => String(Number(a) / Number(b)))) || 30,
        audioSampleRate: parseInt(audioStream?.sample_rate) || 44100,
        audioBitrate: parseInt(audioStream?.bit_rate) || 128000,
        audioChannels: audioStream?.channels || 2,
      });
    });
  });
}

// ─── Decision logic ───

interface TranscodeDecision {
  action: "passthrough" | "remux" | "transcode";
  reason: string;
  needsVideoTranscode: boolean;
  needsAudioTranscode: boolean;
  needsScale: boolean;
  targetWidth: number;
  targetHeight: number;
}

function decideAction(probe: ProbeResult, opts: TranscodeOptions): TranscodeDecision {
  const isH264 = probe.videoCodec === "h264";
  const isAAC = probe.audioCodec === "aac" || !probe.audioCodec; // no audio is OK
  const isMp4 = probe.container.includes("mp4") || probe.container.includes("m4v");
  const isYuv420p = probe.pixelFormat === "yuv420p";

  const maxW = opts.maxWidth || (opts.contentType === "moment" ? 1080 : 1920);
  const maxH = opts.maxHeight || (opts.contentType === "moment" ? 1920 : 1080);

  const needsScale = probe.width > maxW || probe.height > maxH;
  let targetWidth = probe.width;
  let targetHeight = probe.height;

  if (needsScale) {
    const ratio = Math.min(maxW / probe.width, maxH / probe.height);
    targetWidth = Math.round(probe.width * ratio / 2) * 2; // ensure even
    targetHeight = Math.round(probe.height * ratio / 2) * 2;
  }

  const needsVideoTranscode = !isH264 || !isYuv420p || needsScale;
  const needsAudioTranscode = !isAAC && !!probe.audioCodec;

  if (!needsVideoTranscode && !needsAudioTranscode && isMp4) {
    return { action: "passthrough", reason: "Already H.264/AAC in MP4", needsVideoTranscode: false, needsAudioTranscode: false, needsScale: false, targetWidth, targetHeight };
  }

  if (!needsVideoTranscode && !needsAudioTranscode && !isMp4) {
    return { action: "remux", reason: `Remux from ${probe.container} to MP4 (codec copy)`, needsVideoTranscode: false, needsAudioTranscode: false, needsScale: false, targetWidth, targetHeight };
  }

  const reasons: string[] = [];
  if (!isH264) reasons.push(`video codec ${probe.videoCodec}→h264`);
  if (!isYuv420p) reasons.push(`pix_fmt ${probe.pixelFormat}→yuv420p`);
  if (needsScale) reasons.push(`scale ${probe.width}x${probe.height}→${targetWidth}x${targetHeight}`);
  if (needsAudioTranscode) reasons.push(`audio codec ${probe.audioCodec}→aac`);

  return { action: "transcode", reason: reasons.join(", "), needsVideoTranscode, needsAudioTranscode, needsScale, targetWidth, targetHeight };
}

// ─── CRF selection (YouTube-like quality) ───

function selectCRF(height: number, contentType: "video" | "moment"): number {
  // Lower CRF = higher quality. YouTube uses ~CRF 18-23 range.
  if (contentType === "moment") {
    // Moments: slightly higher CRF (smaller files, mobile-first)
    if (height >= 1080) return 22;
    if (height >= 720) return 23;
    return 24;
  }
  // Videos: premium quality
  if (height >= 1080) return 20;
  if (height >= 720) return 21;
  if (height >= 480) return 22;
  return 23;
}

function selectAudioBitrate(contentType: "video" | "moment", channels: number): string {
  if (contentType === "moment") return channels > 1 ? "128k" : "96k";
  return channels > 1 ? "192k" : "128k";
}

function selectPreset(duration: number): string {
  // Shorter videos → slower preset (better compression, acceptable time)
  // Longer videos → faster preset (don't make user wait too long)
  if (duration <= 30) return "medium";
  if (duration <= 120) return "fast";
  return "veryfast";
}

// ─── Main transcode function ───

export async function transcodeVideo(
  inputPath: string,
  opts: TranscodeOptions,
): Promise<TranscodeResult> {
  const ffmpegModule = await import("fluent-ffmpeg");
  const ffmpegStatic = await import("ffmpeg-static");

  const ffmpegPath = (ffmpegStatic as any).default || ffmpegStatic;
  if (ffmpegPath) {
    ffmpegModule.default.setFfmpegPath(ffmpegPath);
  }

  const probe = await probeVideo(inputPath);
  const decision = decideAction(probe, opts);
  const inputSize = statSync(inputPath).size;

  // ─── Passthrough: already optimal, just apply faststart if needed ───
  if (decision.action === "passthrough") {
    return {
      outputPath: inputPath,
      contentType: "video/mp4",
      probeInfo: probe,
      action: "passthrough",
      inputSize,
      outputSize: inputSize,
    };
  }

  const outputPath = tempPath("mp4");

  // ─── Remux: copy codecs, change container ───
  if (decision.action === "remux") {
    await new Promise<void>((resolve, reject) => {
      ffmpegModule.default(inputPath)
        .outputOptions(["-c", "copy", "-movflags", "+faststart"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });

    const outputSize = statSync(outputPath).size;
    return {
      outputPath,
      contentType: "video/mp4",
      probeInfo: probe,
      action: "remuxed",
      inputSize,
      outputSize,
    };
  }

  // ─── Full transcode: H.264/AAC with YouTube-like settings ───
  const crf = selectCRF(decision.targetHeight, opts.contentType);
  const audioBitrate = selectAudioBitrate(opts.contentType, probe.audioChannels);
  const preset = selectPreset(probe.duration);

  const outputOptions: string[] = [
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    "-profile:v", "high",
    "-level:v", "4.1",
  ];

  // Video encoding
  if (decision.needsVideoTranscode) {
    outputOptions.push("-c:v", "libx264", "-crf", String(crf), "-preset", preset);

    // Cap framerate at 60fps
    if (probe.fps > 60) {
      outputOptions.push("-r", "60");
    }

    // Scale if needed (maintain aspect ratio, ensure even dimensions)
    if (decision.needsScale) {
      outputOptions.push("-vf", `scale=${decision.targetWidth}:${decision.targetHeight}`);
    }
  } else {
    outputOptions.push("-c:v", "copy");
  }

  // Audio encoding
  if (!probe.audioCodec) {
    // No audio stream — that's fine
    outputOptions.push("-an");
  } else if (decision.needsAudioTranscode) {
    outputOptions.push("-c:a", "aac", "-b:a", audioBitrate, "-ar", "44100");
  } else {
    outputOptions.push("-c:a", "copy");
  }

  await new Promise<void>((resolve, reject) => {
    ffmpegModule.default(inputPath)
      .outputOptions(outputOptions)
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });

  const outputSize = statSync(outputPath).size;

  // Sanity check: if output is > 110% of input for a transcode, something may be off
  // but we still return it since it's now in the right format
  return {
    outputPath,
    contentType: "video/mp4",
    probeInfo: probe,
    action: decision.needsVideoTranscode ? "transcoded" : "optimized",
    inputSize,
    outputSize,
  };
}

// ─── Download helper ───

export async function downloadToTemp(url: string, ext: string): Promise<string> {
  const filePath = tempPath(ext);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);

  const webStream = res.body as ReadableStream<Uint8Array>;
  const nodeReadable = Readable.fromWeb(webStream as any);
  await pipeline(nodeReadable, createWriteStream(filePath));

  return filePath;
}
