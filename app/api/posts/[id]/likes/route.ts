import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/apiError';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = Number(id);
    if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: likes, error } = await supabase
      .from('likes')
      .select('user_id')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);

    if (error) return safeError(error);

    const userIds = (likes || []).map(l => l.user_id);
    if (userIds.length === 0) {
      return NextResponse.json({ users: [], hasMore: false });
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role')
      .in('user_id', userIds)
      .eq('status', 'active');

    // Get blocked user IDs
    let blockedIdSet = new Set<string>();
    if (user) {
      const admin = createAdminClient();
      const { data: blocks } = await admin
        .from('blocks')
        .select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      blockedIdSet = new Set(
        (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
      );
    }

    // Check which users the current user follows
    let followingSet = new Set<string>();
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', userIds);
      if (follows) followingSet = new Set(follows.map(f => f.following_id));
    }

    // Preserve like order, filter out blocked users
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    const users = userIds
      .map(uid => profileMap.get(uid))
      .filter(Boolean)
      .filter((p: any) => !blockedIdSet.has(p.user_id))
      .map((p: any) => ({
        ...p,
        is_following: followingSet.has(p.user_id),
        is_own: user?.id === p.user_id,
      }));

    return NextResponse.json({ users, hasMore: (likes || []).length > limit });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
