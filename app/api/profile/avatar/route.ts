import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkNsfwBuffer } from "@/lib/nsfwCheck";
import { uploadToR2, deleteFromR2, deleteR2Prefix, r2KeyFromUrl } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateMagicBytes, stripMetadataAndOptimize } from "@/lib/imageSecurityUtils";
import { safeError } from "@/lib/apiError";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";
import { logServerError } from "@/lib/runtimeLogger";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Rate limiter: 5 requests per 5 minutes
const avatarLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkAvatarLimit(userId: string): boolean {
  const now = Date.now();
  const entry = avatarLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    avatarLimitMap.set(userId, { count: 1, resetAt: now + 300_000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

  const adminClient = createAdminClient();
  const plan = await getUserPlan(adminClient, user.id);
  const isAdmin = isAdminPlan(plan);

  if (!isAdmin && !checkAvatarLimit(user.id)) {
    return NextResponse.json({ error: tErrors("uploadRateLimited") }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: tErrors("fileRequired") }, { status: 400 });
  }

  if (!(file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif')) {
    return NextResponse.json({ error: tErrors("avatarInvalidType") }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: tErrors("fileTooLarge") }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // Magic bytes validation
  if (!validateMagicBytes(imageBuffer, file.type)) {
    return NextResponse.json({ error: tErrors("invalidFileContent") }, { status: 400 });
  }

  // Metadata strip + optimize
  const { buffer: cleanBuffer, mimeType: cleanType } = await stripMetadataAndOptimize(imageBuffer, file.type);

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;

  // Check if user is admin (immune to moderation) and onboarding status
  const { data: userProfile } = await adminClient.from('profiles').select('role, onboarding_completed').eq('user_id', user.id).single();
  const isOnboarding = userProfile?.onboarding_completed === false;

  // NSFW check
  let isNsfwAvatar = false;
  let nsfwScores: Record<string, number> = {};

  if (!isAdmin) {
    try {
      const nsfwPromise = checkNsfwBuffer(cleanBuffer, cleanType, 'strict');
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000));
      const nsfwResult = await Promise.race([nsfwPromise, timeout]);

      if (!nsfwResult) {
      } else {
        nsfwScores = nsfwResult.scores || {};
        isNsfwAvatar = nsfwResult.action === 'flag';
      }
    } catch (err) {
      logServerError("[AVATAR NSFW] Check failed, treating as flagged", err, {
        operation: "avatar_nsfw_check",
      });
      isNsfwAvatar = true;
    }
  }

  // Delete old avatar from R2 before uploading new one
  const { data: currentProfile } = await adminClient.from('profiles').select('avatar_url').eq('user_id', user.id).single();
  if (currentProfile?.avatar_url) {
    const oldKey = r2KeyFromUrl(currentProfile.avatar_url);
    if (oldKey) await deleteFromR2(oldKey).catch(() => {});
  }

  // Upload to R2
  const key = `images/${fileName}`;
  const url = await uploadToR2(key, cleanBuffer, cleanType);

  // Single atomic update via adminClient — avatar + moderation status together
  const profileUpdate: Record<string, unknown> = {
    avatar_url: url,
    updated_at: new Date().toISOString(),
  };
  // During onboarding, don't set moderation status — defer to onboarding completion check
  const tErrMod = isNsfwAvatar ? await getTranslations("apiErrors") : null;
  if (isNsfwAvatar && !isOnboarding) {
    profileUpdate.status = 'moderation';
    profileUpdate.moderation_reason = tErrMod!("avatarInappropriateContent");
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update(profileUpdate)
    .eq("user_id", user.id);

  if (updateError) {
    return safeError(updateError);
  }

  // Log NSFW event + moderation decision
  if (isNsfwAvatar) {
    try {
      await adminClient.from('security_events').insert({
        user_id: user.id,
        event_type: 'avatar_nsfw_flagged',
        metadata: { url, scores: nsfwScores },
      });
    } catch (e) {
      logServerError("[AVATAR] security_events insert failed", e, {
        operation: "avatar_security_event_insert",
      });
    }
    try {
      await adminClient.from('moderation_decisions').insert({
        target_type: 'user',
        target_id: user.id,
        decision: 'moderation',
        reason: tErrMod!("avatarInappropriateContent"),
        moderator_id: 'system',
      });
    } catch (e) {
      logServerError("[AVATAR] moderation_decisions insert failed", e, {
        operation: "avatar_moderation_decision_insert",
      });
    }
  }

  return NextResponse.json({ url, nsfw: isNsfwAvatar });
}

export async function DELETE() {
  const tErrors = await getTranslations("apiErrors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

  // Delete avatar files from R2 before clearing DB
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient.from('profiles').select('avatar_url').eq('user_id', user.id).single();
  if (profile?.avatar_url) {
    const key = r2KeyFromUrl(profile.avatar_url);
    if (key) await deleteFromR2(key).catch(() => {});
  }
  await deleteR2Prefix(`images/avatars/${user.id}/`).catch(() => {});

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return safeError(error);
  return NextResponse.json({ success: true });
}
