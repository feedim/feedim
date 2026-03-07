import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteFromR2, deleteR2Prefix, r2KeyFromUrl } from "@/lib/r2";
import { extractR2KeysFromContent } from "@/lib/postCleanup";
import { reconcileSoundStatus } from "@/lib/soundLifecycle";
import { verifyCronSecret } from "@/lib/cronAuth";
import { getTranslations } from "next-intl/server";
import { adjustTagPostCounts } from "@/lib/tagCounts";
import { logServerError } from "@/lib/runtimeLogger";

// Cron: Permanently purge accounts that have been in 'deleted' status for 14+ days.
// After this runs, the account should be as if it never existed.
// Only the deletion reason (in moderation_decisions with decision='deleted') is kept for analytics.

export async function GET(req: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  }

  const admin = createAdminClient();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: accounts } = await admin
    .from("profiles")
    .select("user_id, username, avatar_url")
    .eq("status", "deleted")
    .lt("deleted_at", fourteenDaysAgo)
    .limit(5); // Small batch — each user is heavy

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: tErrors("noAccountsToCleanUp"), count: 0 });
  }

  const results: { user_id: string; success: boolean; error?: string }[] = [];

  for (const account of accounts) {
    try {
      await purgeUserData(admin, account.user_id, account.avatar_url);
      results.push({ user_id: account.user_id, success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "unknown_error";
      logServerError("[account-cleanup] purge failed", err, { operation: "purge_user" });
      results.push({ user_id: account.user_id, success: false, error: message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  return NextResponse.json({
    message: `Purged ${successCount}/${accounts.length} accounts`,
    count: successCount,
    results,
  });
}

async function purgeUserData(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  avatarUrl?: string | null,
) {
  // ─── 1. Collect data needed for FK cleanup before deleting ───

  // All user posts (for FK cleanup + R2 file URLs)
  const { data: userPosts } = await admin
    .from("posts")
    .select("id, status, featured_image, video_url, video_thumbnail, content, sound_id")
    .eq("author_id", userId);
  const postIds = (userPosts || []).map(p => p.id);
  const publishedPostIds = new Set(
    (userPosts || [])
      .filter((post: { status?: string | null }) => post.status === "published")
      .map((post: { id: number }) => post.id)
  );

  // Collect R2 keys from posts
  const r2Keys: string[] = [];
  for (const post of userPosts || []) {
    for (const url of [post.featured_image, post.video_url, post.video_thumbnail]) {
      const key = r2KeyFromUrl(url);
      if (key) r2Keys.push(key);
    }
    if (post.content) {
      r2Keys.push(...extractR2KeysFromContent(post.content));
    }
  }

  // All user comments (for comment_likes FK cleanup)
  const { data: userComments } = await admin
    .from("comments")
    .select("id")
    .eq("author_id", userId);
  const commentIds = (userComments || []).map((c: { id: number }) => c.id);

  // All user sounds (for nullifying references + R2 cleanup)
  const { data: userSounds } = await admin
    .from("sounds")
    .select("id, audio_url, cover_image_url")
    .eq("user_id", userId);
  const soundIds = (userSounds || []).map((s: { id: number }) => s.id);
  for (const sound of userSounds || []) {
    for (const url of [sound.audio_url, sound.cover_image_url]) {
      const key = r2KeyFromUrl(url);
      if (key) r2Keys.push(key);
    }
  }

  // ─── 2. Delete FK-dependent data on user's posts ───
  if (postIds.length > 0) {
    for (let i = 0; i < postIds.length; i += 100) {
      const chunk = postIds.slice(i, i + 100);
      const publishedChunk = chunk.filter((postId) => publishedPostIds.has(postId));
      if (publishedChunk.length > 0) {
        const { data: postTags } = await admin
          .from("post_tags")
          .select("tag_id")
          .in("post_id", publishedChunk);
        await adjustTagPostCounts(
          admin,
          (postTags || []).map((row: { tag_id: number }) => row.tag_id),
          -1
        );
      }
      await Promise.all([
        admin.from("gifts").delete().in("post_id", chunk),
        admin.from("likes").delete().in("post_id", chunk),
        admin.from("bookmarks").delete().in("post_id", chunk),
        admin.from("shares").delete().in("post_id", chunk),
        admin.from("post_views").delete().in("post_id", chunk),
        admin.from("post_tags").delete().in("post_id", chunk),
        admin.from("post_boosts").delete().in("post_id", chunk),
        admin.from("video_frame_hashes").delete().in("post_id", chunk),
        admin.from("audio_fingerprints").delete().in("post_id", chunk),
        admin.from("file_identifiers").delete().in("post_id", chunk),
        admin.from("post_interests").delete().in("post_id", chunk),
        admin.from("analytics_events").delete().in("post_id", chunk),
        admin.from("notifications").delete().in("post_id", chunk),
        admin.from("copyright_claims").delete().in("post_id", chunk),
        admin.from("copyright_verifications").delete().in("post_id", chunk),
        admin.from("coin_transactions").update({ related_post_id: null }).in("related_post_id", chunk),
      ]);
      // Comments on user's posts (and their sub-data)
      const { data: postComments } = await admin.from("comments").select("id").in("post_id", chunk);
      if (postComments && postComments.length > 0) {
        const pcIds = postComments.map((c: { id: number }) => c.id);
        try { await admin.from("comment_likes").delete().in("comment_id", pcIds); } catch {}
      }
      await admin.from("comments").delete().in("post_id", chunk);
      // Moderation records
      for (const pid of chunk) {
        await Promise.all([
          admin.from("moderation_decisions").delete().eq("target_type", "post").eq("target_id", String(pid)),
          admin.from("moderation_logs").delete().eq("target_type", "post").eq("target_id", String(pid)),
          admin.from("reports").delete().eq("content_type", "post").eq("content_id", pid),
        ]).catch(() => {});
      }
    }
    // Reconcile sound status for all sounds referenced by user's posts
    const postSoundIds = [...new Set((userPosts || []).map(p => p.sound_id).filter(Boolean))];
    for (const sid of postSoundIds) {
      try { await reconcileSoundStatus(admin, sid as number); } catch {}
    }
  }

  // ─── 3. Delete FK-dependent data on user's comments ───
  if (commentIds.length > 0) {
    for (let i = 0; i < commentIds.length; i += 100) {
      const chunk = commentIds.slice(i, i + 100);
      await Promise.all([
        admin.from("comment_likes").delete().in("comment_id", chunk),
        admin.from("notifications").delete().eq("object_type", "comment").in("object_id", chunk),
      ]);
      for (const cid of chunk) {
        await Promise.all([
          admin.from("moderation_decisions").delete().eq("target_type", "comment").eq("target_id", String(cid)),
          admin.from("moderation_logs").delete().eq("target_type", "comment").eq("target_id", String(cid)),
          admin.from("reports").delete().eq("content_type", "comment").eq("content_id", cid),
        ]).catch(() => {});
      }
    }
  }

  // ─── 4. Nullify sound references before deleting sounds ───
  if (soundIds.length > 0) {
    try { await admin.from("posts").update({ sound_id: null }).in("sound_id", soundIds); } catch {}
  }

  // ─── 5. Delete all user-level data (DB triggers handle count updates) ───
  await Promise.all([
    // User's posts & comments
    admin.from("posts").delete().eq("author_id", userId),
    admin.from("comments").delete().eq("author_id", userId),
    // Interactions on others' content (triggers decrement counts)
    admin.from("likes").delete().eq("user_id", userId),
    admin.from("comment_likes").delete().eq("user_id", userId),
    admin.from("bookmarks").delete().eq("user_id", userId),
    admin.from("shares").delete().eq("user_id", userId),
    admin.from("post_views").delete().eq("user_id", userId),
    admin.from("analytics_events").delete().eq("user_id", userId),
    // Social graph (triggers decrement follower/following counts)
    admin.from("follows").delete().eq("follower_id", userId),
    admin.from("follows").delete().eq("following_id", userId),
    admin.from("follow_requests").delete().eq("follower_id", userId),
    admin.from("follow_requests").delete().eq("following_id", userId),
    admin.from("blocks").delete().eq("blocker_id", userId),
    admin.from("blocks").delete().eq("blocked_id", userId),
    // Notifications
    admin.from("notifications").delete().eq("user_id", userId),
    admin.from("notifications").delete().eq("actor_id", userId),
    // Financial
    admin.from("coin_transactions").delete().eq("user_id", userId),
    admin.from("coin_payments").delete().eq("user_id", userId),
    admin.from("premium_payments").delete().eq("user_id", userId),
    admin.from("premium_subscriptions").delete().eq("user_id", userId),
    admin.from("withdrawal_requests").delete().eq("user_id", userId),
    admin.from("gifts").delete().eq("sender_id", userId),
    admin.from("gifts").delete().eq("receiver_id", userId),
    // Reports
    admin.from("reports").delete().eq("reporter_id", userId),
    // Tags & interests
    admin.from("tag_follows").delete().eq("user_id", userId),
    admin.from("user_interests").delete().eq("user_id", userId),
    // Profile visits
    admin.from("profile_visits").delete().eq("visitor_id", userId),
    admin.from("profile_visits").delete().eq("visited_id", userId),
    // Sessions & security
    admin.from("sessions").delete().eq("user_id", userId),
    admin.from("security_events").delete().eq("user_id", userId),
    // Coupons
    admin.from("coupon_usages").delete().eq("user_id", userId),
    // Copyright
    admin.from("copyright_applications").delete().eq("user_id", userId),
    admin.from("copyright_verifications").delete().eq("user_id", userId),
    admin.from("copyright_claims").delete().eq("claimant_id", userId),
    // Sounds
    admin.from("sounds").delete().eq("user_id", userId),
    // Moderation logs for user
    admin.from("moderation_logs").delete().eq("target_type", "user").eq("target_id", userId),
    // Username redirects
    admin.from("username_redirects").delete().eq("user_id", userId),
  ]);

  // Nullify related_user_id in other users' coin_transactions
  try { await admin.from("coin_transactions").update({ related_user_id: null }).eq("related_user_id", userId); } catch {}

  // ─── 6. Clean moderation_decisions — keep ONLY the deletion reason record ───
  const { data: modDecisions } = await admin
    .from("moderation_decisions")
    .select("id, decision")
    .eq("target_type", "user")
    .eq("target_id", userId);
  if (modDecisions) {
    const toDelete = modDecisions.filter(d => d.decision !== "deleted").map(d => d.id);
    if (toDelete.length > 0) {
      try { await admin.from("moderation_decisions").delete().in("id", toDelete); } catch {}
    }
  }

  // ─── 7. Delete R2 storage files ───
  await Promise.all([
    deleteR2Prefix(`images/avatars/${userId}/`),
    deleteR2Prefix(`videos/${userId}/`),
    deleteR2Prefix(`audio/${userId}/`),
    deleteR2Prefix(`images/${userId}/`),
  ]).catch(() => {});

  // Individual R2 keys from post images/thumbnails
  for (const key of r2Keys) {
    await deleteFromR2(key).catch(() => {});
  }

  // Avatar URL from profile
  if (avatarUrl) {
    const avatarKey = r2KeyFromUrl(avatarUrl);
    if (avatarKey) await deleteFromR2(avatarKey).catch(() => {});
  }

  // ─── 8. Delete auth user (cascades to profiles table via FK) ───
  await admin.auth.admin.deleteUser(userId);
}
