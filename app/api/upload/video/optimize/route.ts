import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, r2KeyFromUrl } from "@/lib/r2";
import { readFileSync } from "fs";
import { getTranslations } from "next-intl/server";
import { safeError } from "@/lib/apiError";
import { getRedis } from "@/lib/redis";

/**
 * POST /api/upload/video/optimize
 *
 * Accepts a video URL (already uploaded to R2), transcodes it to optimal
 * H.264/AAC MP4, uploads the optimized version back to R2, returns new URL.
 *
 * Both web and mobile clients call this after raw upload.
 *
 * Body: { videoUrl: string, contentType: "video" | "moment" }
 * Response: { optimizedUrl: string, action: string, inputSize: number, outputSize: number, probe: {...} }
 */

// Rate limiter: 3 optimize requests per 10 minutes per user
const optimizeLimitMap = new Map<string, { count: number; resetAt: number }>();
async function checkOptimizeLimit(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    const key = `rl:video-opt:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 600);
    return count <= 3;
  }
  const now = Date.now();
  const entry = optimizeLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    optimizeLimitMap.set(userId, { count: 1, resetAt: now + 600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

export const maxDuration = 300; // 5 minutes max for serverless

export async function POST(request: NextRequest) {
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tErrors = await getTranslations("apiErrors");
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    if (!(await checkOptimizeLimit(user.id))) {
      return NextResponse.json({ error: tErrors("uploadRateLimited") }, { status: 429 });
    }

    const body = await request.json();
    const { videoUrl, contentType } = body as { videoUrl?: string; contentType?: string };

    if (!videoUrl || !contentType || !["video", "moment"].includes(contentType)) {
      return NextResponse.json({ error: "videoUrl and contentType (video|moment) required" }, { status: 400 });
    }

    // Verify URL belongs to our CDN
    const r2Key = r2KeyFromUrl(videoUrl);
    if (!r2Key) {
      return NextResponse.json({ error: "Invalid video URL" }, { status: 400 });
    }

    // Verify the R2 key belongs to this user
    if (!r2Key.startsWith(`videos/${user.id}/`)) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });
    }

    // Dynamic import — keep cold start light
    const { downloadToTemp, transcodeVideo, cleanupFile } = await import("@/lib/videoTranscode");

    // Download video from R2
    const ext = r2Key.split(".").pop() || "mp4";
    inputPath = await downloadToTemp(videoUrl, ext);

    // Transcode
    const result = await transcodeVideo(inputPath, {
      contentType: contentType as "video" | "moment",
    });

    outputPath = result.outputPath;

    // If passthrough, no need to re-upload
    if (result.action === "passthrough") {
      cleanupFile(inputPath);
      return NextResponse.json({
        optimizedUrl: videoUrl,
        action: "passthrough",
        inputSize: result.inputSize,
        outputSize: result.outputSize,
        probe: {
          videoCodec: result.probeInfo.videoCodec,
          audioCodec: result.probeInfo.audioCodec,
          width: result.probeInfo.width,
          height: result.probeInfo.height,
          duration: result.probeInfo.duration,
        },
      });
    }

    // Upload optimized video to R2 (same directory, new filename)
    const dir = r2Key.substring(0, r2Key.lastIndexOf("/") + 1);
    const optimizedKey = `${dir}${Date.now()}_optimized.mp4`;
    const optimizedBuffer = readFileSync(outputPath);

    const publicUrl = await uploadToR2(optimizedKey, optimizedBuffer, "video/mp4");

    // Cleanup temp files
    cleanupFile(inputPath);
    if (outputPath !== inputPath) cleanupFile(outputPath);
    inputPath = null;
    outputPath = null;

    return NextResponse.json({
      optimizedUrl: publicUrl,
      originalUrl: videoUrl,
      action: result.action,
      inputSize: result.inputSize,
      outputSize: result.outputSize,
      savings: result.inputSize > 0
        ? Math.round((1 - result.outputSize / result.inputSize) * 100)
        : 0,
      probe: {
        videoCodec: result.probeInfo.videoCodec,
        audioCodec: result.probeInfo.audioCodec,
        width: result.probeInfo.width,
        height: result.probeInfo.height,
        duration: result.probeInfo.duration,
      },
    });
  } catch (err: unknown) {
    // Cleanup on error
    if (inputPath) {
      const { cleanupFile } = await import("@/lib/videoTranscode");
      cleanupFile(inputPath);
      if (outputPath && outputPath !== inputPath) cleanupFile(outputPath);
    }
    return safeError(err);
  }
}
