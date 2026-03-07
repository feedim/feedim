import { createAdminClient } from './supabase/admin';
import { deleteFromR2, r2KeyFromUrl } from './r2';

/**
 * Reconcile a sound's status and usage_count based on its associated posts.
 *
 * - publishedPosts > 0 → status = 'active', usage_count = publishedPosts
 * - publishedPosts = 0, totalPosts > 0 → status = 'muted', usage_count = 0
 * - totalPosts = 0 → delete sound (DB + R2 assets)
 *
 * Original sounds share audio_url with the video, so only cover_image is deleted from R2.
 */
export async function reconcileSoundStatus(
  admin: ReturnType<typeof createAdminClient>,
  soundId: number
) {
  // 1. Fetch sound record
  const { data: sound } = await admin
    .from('sounds')
    .select('id, audio_url, cover_image_url, is_original, status')
    .eq('id', soundId)
    .single();
  if (!sound) return;

  // Admin-removed sounds should not be reconciled back to active
  if (sound.status === 'removed') return;

  // 2. Count ALL posts using this sound
  const { count: totalPosts } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('sound_id', soundId);

  // 3. Count published, non-NSFW posts using this sound
  const { count: publishedPosts } = await admin
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('sound_id', soundId)
    .eq('status', 'published')
    .eq('is_nsfw', false);

  // 4. Decide action
  if ((totalPosts ?? 0) === 0) {
    // No posts reference this sound → delete it
    // Original sounds: audio_url = video_url, do NOT delete audio from R2
    if (!sound.is_original && sound.audio_url) {
      const key = r2KeyFromUrl(sound.audio_url);
      if (key) await deleteFromR2(key);
    }
    if (sound.cover_image_url) {
      const key = r2KeyFromUrl(sound.cover_image_url);
      if (key) await deleteFromR2(key);
    }
    await admin.from('sounds').delete().eq('id', soundId);
  } else if ((publishedPosts ?? 0) > 0) {
    // At least one published, clean post → active
    await admin.from('sounds')
      .update({ status: 'active', usage_count: publishedPosts ?? 0 })
      .eq('id', soundId);
  } else {
    // Posts exist but none are published+clean → hide from search
    await admin.from('sounds')
      .update({ status: 'muted', usage_count: 0 })
      .eq('id', soundId);
  }
}
