import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification, resolvePostNotificationRecipient } from '@/lib/notifications';
import { getUserPlan, checkDailyLimit, isAdminPlan, logRateLimitHit } from '@/lib/limits';
import { safeError } from '@/lib/apiError';
import { checkEmailVerified } from '@/lib/emailGate';
import { getTranslations } from 'next-intl/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    const supabase = await createClient();
    const admin = createAdminClient();
    const tErrors = await getTranslations("apiErrors");
    const tNotif = await getTranslations("notifications");
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    // Private account access check
    const { data: postAccess } = await admin
      .from('posts')
      .select('author_id, profiles!posts_author_id_fkey(account_private)')
      .eq('id', postId).single();
    if (postAccess) {
      const _a = Array.isArray(postAccess.profiles) ? postAccess.profiles[0] : postAccess.profiles;
      if ((_a as any)?.account_private && postAccess.author_id !== user.id) {
        const { data: _f } = await admin.from('follows').select('id')
          .eq('follower_id', user.id).eq('following_id', postAccess.author_id).maybeSingle();
        if (!_f) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 403 });
      }
    }

    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);

    // Access restriction check
    const { data: myProfile } = isAdminUser
      ? { data: null as null | { restricted_like?: boolean } }
      : await admin
          .from('profiles')
          .select('restricted_like')
          .eq('user_id', user.id)
          .single();
    if (myProfile?.restricted_like) {
      return NextResponse.json({ error: tErrors("communityProtectionRestricted") }, { status: 403 });
    }

    // Email verification gate
    const emailCheck = await checkEmailVerified(admin, user.id, 'like');
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    // Burst rate limit — max 10 likes per 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    const { count: recentLikes } = await admin
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', tenSecondsAgo);
    if (!isAdminUser && recentLikes && recentLikes >= 10) {
      return NextResponse.json({ error: tErrors("tooFastAction") }, { status: 429 });
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
    const { allowed, limit } = await checkDailyLimit(admin, user.id, 'like', plan);
    if (!allowed) {
      logRateLimitHit(admin, user.id, 'like', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim());
      return NextResponse.json(
        { error: tErrors("communityProtectionLimited"), limit, remaining: 0 },
        { status: 429 }
      );
    }

    // Like — trigger increments like_count
    const { error } = await admin
      .from('likes')
      .insert({ user_id: user.id, post_id: postId });

    if (error) {
      return safeError(error);
    }

    // Read trigger-updated like_count
    const { data: updated } = await admin.from('posts').select('like_count').eq('id', postId).single();

    // Create notification for post author
    const notificationUserId = await resolvePostNotificationRecipient(admin, postId);
    if (notificationUserId) {
      await createNotification({
        admin,
        user_id: notificationUserId,
        actor_id: user.id,
        type: 'like',
        object_type: 'post',
        object_id: postId,
        content: tNotif("likedYourPost"),
      });
    }

    return NextResponse.json({ liked: true, like_count: updated?.like_count || 0 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
