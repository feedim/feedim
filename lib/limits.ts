// Plan bazlı günlük aksiyon limitleri
// Free = premium değil, basic/pro/max = premium planları

import type { SupabaseClient } from "@supabase/supabase-js";

export const DAILY_LIMITS = {
  follow:  { free: 20,  basic: 40,  pro: 100, max: 200,  business: 200  },
  like:    { free: 50,  basic: 100, pro: 300, max: 1000, business: 1000 },
  comment: { free: 30,  basic: 60,  pro: 200, max: 500,  business: 500  },
} as const;

/** Saatlik gönderi limitleri: free/basic = 5, premium = 7 */
export const HOURLY_POST_LIMITS: Record<PlanTier, number> = {
  free: 5,
  basic: 5,
  pro: 7,
  max: 7,
  business: 7,
};

/** Plan bazli yorum karakter limiti: max ve business 500, digerleri 250 */
export const COMMENT_CHAR_LIMITS: Record<PlanTier, number> = {
  free: 250,
  basic: 250,
  pro: 250,
  max: 500,
  business: 500,
};

type ActionType = keyof typeof DAILY_LIMITS;
type PlanTier = "free" | "basic" | "pro" | "max" | "business";

/** Kullanıcının premium planını döndürür */
export async function getUserPlan(admin: SupabaseClient, userId: string): Promise<PlanTier> {
  const { data } = await admin
    .from("profiles")
    .select("is_premium, premium_plan")
    .eq("user_id", userId)
    .single();

  if (!data?.is_premium || !data.premium_plan) return "free";
  if (["basic", "pro", "max", "business"].includes(data.premium_plan)) return data.premium_plan as PlanTier;
  return "free";
}

/** Günlük limit aşılmış mı kontrol eder. { allowed, remaining, limit } döndürür. */
export async function checkDailyLimit(
  admin: SupabaseClient,
  userId: string,
  action: ActionType,
  plan: PlanTier
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = DAILY_LIMITS[action][plan];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let count = 0;

  const iso = todayStart.toISOString();

  if (action === "follow") {
    const { count: c } = await admin
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId)
      .gte("created_at", iso);
    count = c || 0;
  } else if (action === "like") {
    const { count: c } = await admin
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", iso);
    count = c || 0;
  } else if (action === "comment") {
    const { count: c } = await admin
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .gte("created_at", iso);
    count = c || 0;
  }

  const remaining = Math.max(0, limit - count);
  return { allowed: count < limit, remaining, limit };
}

/** Saatlik gönderi limiti kontrolü */
export async function checkHourlyPostLimit(
  admin: SupabaseClient,
  userId: string,
  plan: PlanTier
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = HOURLY_POST_LIMITS[plan];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId)
    .gte("created_at", oneHourAgo);

  const used = count || 0;
  const remaining = Math.max(0, limit - used);
  return { allowed: used < limit, remaining, limit };
}

/** Rate limit ihlalini security_events tablosuna fire-and-forget olarak loglar */
export function logRateLimitHit(
  admin: SupabaseClient,
  userId: string,
  action: string,
  ip?: string | null,
) {
  admin
    .from("security_events")
    .insert({
      user_id: userId,
      event_type: "rate_limit_hit",
      metadata: { action },
      ip_address: ip || null,
    })
    .then(() => {}, () => {});
}
