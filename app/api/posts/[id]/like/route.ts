import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getUserPlan, checkDailyLimit, logRateLimitHit } from '@/lib/limits';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Access restriction check
    const { data: myProfile } = await admin
      .from('profiles')
      .select('restricted_like')
      .eq('user_id', user.id)
      .single();
    if (myProfile?.restricted_like) {
      return NextResponse.json({ error: 'Beğeni özelliğiniz kısıtlanmıştır' }, { status: 403 });
    }

    // Check if already liked
    const { data: existing } = await admin
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();

    if (existing) {
      // Unlike — trigger decrements like_count
      await admin.from('likes').delete().eq('id', existing.id);

      // Remove notification
      await admin.from('notifications').delete()
        .eq('actor_id', user.id)
        .eq('type', 'like')
        .eq('object_type', 'post')
        .eq('object_id', postId);

      // Read trigger-updated like_count
      const { data: updated } = await admin.from('posts').select('like_count').eq('id', postId).single();
      return NextResponse.json({ liked: false, like_count: updated?.like_count || 0 });
    }

    // Daily like limit check
    const plan = await getUserPlan(admin, user.id);
    const { allowed, limit } = await checkDailyLimit(admin, user.id, 'like', plan);
    if (!allowed) {
      logRateLimitHit(admin, user.id, 'like', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim());
      return NextResponse.json(
        { error: `Günlük beğeni limitine ulaştın (${limit}). Premium ile artır.`, limit, remaining: 0 },
        { status: 429 }
      );
    }

    // Like — trigger increments like_count
    const { error } = await admin
      .from('likes')
      .insert({ user_id: user.id, post_id: postId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Read trigger-updated like_count
    const { data: updated } = await admin.from('posts').select('like_count').eq('id', postId).single();

    // Create notification for post author
    const { data: post } = await admin
      .from('posts')
      .select('user_id, content_type')
      .eq('id', postId)
      .single();

    if (post) {
      const likeContent = post.content_type === 'note'
        ? 'notunuzu beğendi'
        : post.content_type === 'video'
          ? 'videonuzu beğendi'
          : post.content_type === 'moment'
            ? 'momentinizi beğendi'
            : 'gönderinizi beğendi';
      await createNotification({
        admin,
        user_id: post.user_id,
        actor_id: user.id,
        type: 'like',
        object_type: 'post',
        object_id: postId,
        content: likeContent,
      });
    }

    return NextResponse.json({ liked: true, like_count: updated?.like_count || 0 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
