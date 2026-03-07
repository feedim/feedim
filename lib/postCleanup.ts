import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteFromR2, r2KeyFromUrl } from './r2';
import { reconcileSoundStatus } from './soundLifecycle';
import { adjustTagPostCounts, getPostTagIds } from './tagCounts';

/**
 * Extract R2 keys from inline <img> tags in HTML content.
 * Only extracts CDN URLs (cdn.feedim.com).
 */
export function extractR2KeysFromContent(content: string): string[] {
  if (!content) return [];
  const keys: string[] = [];
  const regex = /<img[^>]+src=["'](https:\/\/cdn\.feedim\.com\/[^"']+)["']/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = r2KeyFromUrl(match[1]);
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Clean up ALL data associated with a single post.
 * Used by both DELETE /api/posts/[id] and account-cleanup cron.
 */
export async function cleanupPostData(
  admin: SupabaseClient,
  postId: number,
  post: {
    status?: string | null;
    featured_image?: string | null;
    video_url?: string | null;
    video_thumbnail?: string | null;
    content?: string | null;
    sound_id?: number | null;
  }
) {
  // 1. Delete comment_likes for all comments on this post, then delete comments
  const { data: postComments } = await admin
    .from('comments')
    .select('id')
    .eq('post_id', postId);
  if (postComments && postComments.length > 0) {
    const commentIds = postComments.map((c: { id: number }) => c.id);
    await admin.from('comment_likes').delete().in('comment_id', commentIds);
  }
  await admin.from('comments').delete().eq('post_id', postId);

  // 2a. Decrement tag post_count before deleting post_tags
  if (post.status === 'published') {
    const postTagIds = await getPostTagIds(admin, postId);
    await adjustTagPostCounts(admin, postTagIds, -1);
  }

  // 2. Delete all FK-dependent tables
  await Promise.all([
    admin.from('likes').delete().eq('post_id', postId),
    admin.from('bookmarks').delete().eq('post_id', postId),
    admin.from('shares').delete().eq('post_id', postId),
    admin.from('post_views').delete().eq('post_id', postId),
    admin.from('post_tags').delete().eq('post_id', postId),
    admin.from('post_boosts').delete().eq('post_id', postId),
    admin.from('video_frame_hashes').delete().eq('post_id', postId),
    admin.from('audio_fingerprints').delete().eq('post_id', postId),
    admin.from('file_identifiers').delete().eq('post_id', postId),
    admin.from('post_interests').delete().eq('post_id', postId),
    admin.from('analytics_events').delete().eq('post_id', postId),
    admin.from('copyright_claims').delete().eq('post_id', postId),
    admin.from('copyright_verifications').delete().eq('content_id', postId),
    admin.from('gifts').delete().eq('post_id', postId),
    admin.from('notifications').delete().eq('post_id', postId),
    admin.from('reports').delete().eq('content_type', 'post').eq('content_id', postId),
    admin.from('moderation_decisions').delete().eq('target_type', 'post').eq('target_id', String(postId)),
    admin.from('moderation_logs').delete().eq('target_type', 'post').eq('target_id', String(postId)),
  ]);

  // 3. Nullify coin_transactions reference (don't delete)
  await admin.from('coin_transactions').update({ related_post_id: null }).eq('related_post_id', postId);

  // 4. R2 media cleanup
  const keysToDelete: string[] = [];
  for (const url of [post.featured_image, post.video_url, post.video_thumbnail]) {
    const key = r2KeyFromUrl(url as string);
    if (key) keysToDelete.push(key);
  }
  if (post.content) {
    keysToDelete.push(...extractR2KeysFromContent(post.content));
  }
  for (const key of keysToDelete) {
    await deleteFromR2(key).catch(() => {});
  }

  // 5. Sound lifecycle reconciliation
  if (post.sound_id) {
    try {
      await reconcileSoundStatus(admin, post.sound_id as number);
    } catch {}
  }
}
