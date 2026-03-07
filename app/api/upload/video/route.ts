import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPresignedUploadUrl } from "@/lib/r2";
import { VIDEO_ALLOWED_TYPES, VIDEO_MAX_SIZE_MB } from "@/lib/constants";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { nanoid } from "nanoid";
import { safeError } from "@/lib/apiError";
import { getTranslations } from "next-intl/server";

const MAX_FILE_SIZE = VIDEO_MAX_SIZE_MB * 1024 * 1024;

// Rate limiter: 5 requests per 10 minutes
const videoLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkVideoLimit(userId: string): boolean {
  const now = Date.now();
  const entry = videoLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    videoLimitMap.set(userId, { count: 1, resetAt: now + 600_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// POST: Generate presigned URL for direct-to-R2 upload
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tErrors = await getTranslations("apiErrors");
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const plan = await getUserPlan(createAdminClient(), user.id);
    if (!isAdminPlan(plan) && !checkVideoLimit(user.id)) {
      return NextResponse.json({ error: tErrors("uploadRateLimited") }, { status: 429 });
    }

    const { filename, contentType, fileSize } = await request.json();

    if (!filename || !contentType || !fileSize) {
      return NextResponse.json({ error: tErrors("fileInfoRequired") }, { status: 400 });
    }

    if (!(VIDEO_ALLOWED_TYPES as readonly string[]).includes(contentType)) {
      return NextResponse.json({ error: tErrors("unsupportedFormat") }, { status: 400 });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: tErrors("videoMaxSize", { size: MAX_FILE_SIZE / 1024 / 1024 }) }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
    const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 10) || "mp4";
    const key = `videos/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`;

    const feedimFileId = nanoid(16);
    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(key, contentType, undefined, undefined, { "x-fdm-id": feedimFileId });

    // Track upload for orphan cleanup (post_id set later at publish time)
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      await createAdminClient().from('file_identifiers').insert({
        feedim_id: feedimFileId,
        file_type: 'video',
        uploader_id: user.id,
        post_id: null,
        storage_key: key,
      });
    } catch {}

    return NextResponse.json({ uploadUrl, publicUrl, key, feedimFileId });
  } catch (err: unknown) {
    return safeError(err);
  }
}
