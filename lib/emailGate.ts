import { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";

export type EmailGateAction =
  | "follow"
  | "like"
  | "comment"
  | "gift"
  | "post"
  | "comment_like"
  | "boost"
  | "sound"
  | "tag_follow"
  | "save"
  | "share";

/**
 * E-posta doğrulama kontrolü. Doğrulanmamışsa hata mesajı döner.
 * Takip için onboarding sırasında max 15 izin verir (tanıdıklarını bul sayfası).
 */
export async function checkEmailVerified(
  admin: SupabaseClient,
  userId: string,
  action: EmailGateAction,
): Promise<{ allowed: boolean; error?: string }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("email_verified, onboarding_completed, role")
    .eq("user_id", userId)
    .single();

  if (!profile) {
    const tErrors = await getTranslations("apiErrors");
    return { allowed: false, error: tErrors("profileNotFound") };
  }
  if (profile.role === "admin") return { allowed: true };
  if (profile.email_verified) return { allowed: true };

  // Takip istisnası: onboarding sırasında max 15
  if (action === "follow" && !profile.onboarding_completed) {
    const { count } = await admin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId);
    if ((count || 0) < 15) return { allowed: true };
  }

  const tErrors = await getTranslations("apiErrors");
  return { allowed: false, error: tErrors("emailVerificationRequired") };
}
