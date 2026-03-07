import { createAdminClient } from '@/lib/supabase/admin';

export type ProfileSignals = {
  profileScore?: number;
  spamScore?: number;
  nsfwPosts30d?: number;
  removedPosts90d?: number;
  nsfwComments30d?: number;
  reportsAgainst30d?: number;
};

export async function getProfileSignals(userId: string): Promise<ProfileSignals> {
  const admin = createAdminClient();
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [prof, nsfwPosts, removedPosts, nsfwComments, reportsAgainst] = await Promise.all([
    admin.from('profiles').select('profile_score, spam_score').eq('user_id', userId).single(),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_nsfw', true).gte('created_at', since30),
    admin.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('status', 'removed').gte('removed_at', since90),
    admin.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', userId).eq('is_nsfw', true).gte('created_at', since30),
    admin.from('reports').select('id', { count: 'exact', head: true }).eq('content_type', 'user').eq('content_id', userId).gte('created_at', since30),
  ]);

  return {
    profileScore: prof.data?.profile_score,
    spamScore: prof.data?.spam_score,
    nsfwPosts30d: nsfwPosts.count || 0,
    removedPosts90d: removedPosts.count || 0,
    nsfwComments30d: nsfwComments.count || 0,
    reportsAgainst30d: reportsAgainst.count || 0,
  };
}

