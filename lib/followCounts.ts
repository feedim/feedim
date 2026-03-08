import { SupabaseClient } from "@supabase/supabase-js";

const BATCH_SIZE = 300;

/**
 * Count followers of `userId` that have an active profile.
 * Uses batched `.in()` queries for scalability.
 */
export async function countActiveFollowers(admin: SupabaseClient, userId: string): Promise<number> {
  const { data: rows } = await admin
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId);

  if (!rows || rows.length === 0) return 0;

  const ids = rows.map(r => r.follower_id);
  let total = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const { count } = await admin
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .in("user_id", ids.slice(i, i + BATCH_SIZE))
      .eq("status", "active");
    total += count ?? 0;
  }

  return total;
}

/**
 * Count users that `userId` follows and that have an active profile.
 */
export async function countActiveFollowing(admin: SupabaseClient, userId: string): Promise<number> {
  const { data: rows } = await admin
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (!rows || rows.length === 0) return 0;

  const ids = rows.map(r => r.following_id);
  let total = 0;

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const { count } = await admin
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .in("user_id", ids.slice(i, i + BATCH_SIZE))
      .eq("status", "active");
    total += count ?? 0;
  }

  return total;
}

/**
 * Recalculate and update both follower_count and following_count for a user.
 * Only counts follows where the other user has an active profile.
 */
export async function syncFollowCounts(admin: SupabaseClient, userId: string) {
  const [followerCount, followingCount] = await Promise.all([
    countActiveFollowers(admin, userId),
    countActiveFollowing(admin, userId),
  ]);

  await admin
    .from("profiles")
    .update({ follower_count: followerCount, following_count: followingCount })
    .eq("user_id", userId);

  return { followerCount, followingCount };
}
