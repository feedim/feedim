import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkNsfwBuffer } from "@/lib/nsfwCheck";
import { uploadToR2 } from "@/lib/r2";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateMagicBytes, stripMetadataAndOptimize } from "@/lib/imageSecurityUtils";
import { safeError } from "@/lib/apiError";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkAvatarLimit(user.id)) {
    return NextResponse.json({ error: "Topluluğumuzu korumak adına yükleme hızınız sınırlandırıldı, lütfen bekleyin" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });

  if (!(file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif')) {
    return NextResponse.json({ error: 'Sadece JPEG, PNG, WebP ve GIF profil fotoğrafları kabul edilir' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Dosya çok büyük. Maksimum 5MB." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);

  // Magic bytes validation
  if (!validateMagicBytes(imageBuffer, file.type)) {
    return NextResponse.json({ error: "Geçersiz dosya içeriği" }, { status: 400 });
  }

  // Metadata strip + optimize
  const { buffer: cleanBuffer, mimeType: cleanType } = await stripMetadataAndOptimize(imageBuffer, file.type);

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;

  const adminClient = createAdminClient();

  // Check if user is admin (immune to moderation) and onboarding status
  const { data: userProfile } = await adminClient.from('profiles').select('role, onboarding_completed').eq('user_id', user.id).single();
  const isAdmin = userProfile?.role === 'admin';
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
        if (process.env.NODE_ENV === "development") console.warn("[AVATAR NSFW] Check timed out after 15s, allowing upload");
      } else {
        nsfwScores = nsfwResult.scores || {};
        if (process.env.NODE_ENV === "development") console.log("[AVATAR NSFW]", user.id, nsfwResult.action, JSON.stringify(nsfwScores));
        isNsfwAvatar = nsfwResult.action === 'flag';
        if (process.env.NODE_ENV === "development") console.log("[AVATAR NSFW] shouldFlag:", isNsfwAvatar);
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("[AVATAR NSFW] Check failed, treating as NSFW:", err);
      isNsfwAvatar = true;
    }
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
  if (isNsfwAvatar && !isOnboarding) {
    profileUpdate.status = 'moderation';
    profileUpdate.moderation_reason = 'Profil fotoğrafında uygunsuz içerik tespit edildi';
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update(profileUpdate)
    .eq("user_id", user.id);

  if (updateError) {
    if (process.env.NODE_ENV === "development") console.error("[AVATAR] Profile update failed:", updateError);
    return safeError(updateError);
  }

  // Log NSFW event + moderation decision
  if (isNsfwAvatar) {
    if (process.env.NODE_ENV === "development") console.log("[AVATAR NSFW] Profile sent to moderation:", user.id);
    try {
      await adminClient.from('security_events').insert({
        user_id: user.id,
        event_type: 'avatar_nsfw_flagged',
        metadata: { url, scores: nsfwScores },
      });
    } catch (e) { if (process.env.NODE_ENV === "development") console.error("[AVATAR] security_events insert failed:", e); }
    try {
      await adminClient.from('moderation_decisions').insert({
        target_type: 'user',
        target_id: user.id,
        decision: 'moderation',
        reason: 'Profil fotoğrafında uygunsuz içerik tespit edildi',
        moderator_id: 'system',
        decision_code: String(Math.floor(100000 + Math.random() * 900000)),
      });
    } catch (e) { if (process.env.NODE_ENV === "development") console.error("[AVATAR] moderation_decisions insert failed:", e); }
  }

  return NextResponse.json({ url, nsfw: isNsfwAvatar });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("user_id", user.id);

  if (error) return safeError(error);
  return NextResponse.json({ success: true });
}
