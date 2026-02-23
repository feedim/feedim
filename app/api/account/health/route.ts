import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Get profile data + user's post IDs in parallel
    const [profileRes, postsRes] = await Promise.all([
      admin
        .from('profiles')
        .select('copyright_strike_count, spam_score, status')
        .eq('user_id', user.id)
        .single(),
      admin
        .from('posts')
        .select('id')
        .eq('author_id', user.id)
        .limit(500),
    ]);

    const profile = profileRes.data;
    const postIds = (postsRes.data || []).map((p: any) => String(p.id));

    // Count moderation decisions by reason category
    const [postDecisionsRes, userDecisionsRes] = await Promise.all([
      // Post-level decisions (target_id = post ID string)
      postIds.length > 0
        ? admin
            .from('moderation_decisions')
            .select('reason')
            .eq('target_type', 'post')
            .in('target_id', postIds)
            .in('decision', ['remove', 'moderation', 'flag'])
        : Promise.resolve({ data: [] }),
      // User-level decisions (target_id = user UUID)
      admin
        .from('moderation_decisions')
        .select('reason')
        .eq('target_type', 'user')
        .eq('target_id', user.id)
        .in('decision', ['warn', 'moderation', 'block']),
    ]);

    // Categorize violations
    let copyrightStrikes = profile?.copyright_strike_count || 0;
    let nsfwStrikes = 0;
    let spamStrikes = 0;
    let copyContentStrikes = 0;

    const allDecisions = [...(postDecisionsRes.data || []), ...(userDecisionsRes.data || [])];
    for (const d of allDecisions) {
      const reason = (d.reason || '').toLowerCase();
      if (reason.includes('cinsel') || reason.includes('nsfw') || reason.includes('sexual') || reason.includes('müstehcen')) {
        nsfwStrikes++;
      } else if (reason.includes('spam')) {
        spamStrikes++;
      } else if (reason.includes('kopya') || reason.includes('copy')) {
        copyContentStrikes++;
      }
    }

    return NextResponse.json({
      copyright_strikes: copyrightStrikes,
      nsfw_strikes: nsfwStrikes,
      spam_strikes: spamStrikes,
      copy_content_strikes: copyContentStrikes,
      spam_score: profile?.spam_score || 0,
      status: profile?.status || 'active',
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
