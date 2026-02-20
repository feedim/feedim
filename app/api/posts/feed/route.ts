import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FEED_PAGE_SIZE } from '@/lib/constants';
import { cached } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = Number(request.nextUrl.searchParams.get('page')) || 1;
    const offset = (page - 1) * FEED_PAGE_SIZE;

    // Cached user data (2 min TTL)
    const blockedIds = await cached(`user:${user.id}:blocks`, 120, async () => {
      const { data: blocks } = await admin
        .from('blocks')
        .select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      return new Set(
        (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
      );
    });

    const followedUserIds = await cached(`user:${user.id}:follows`, 120, async () => {
      const { data: followedUsers } = await admin
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      return (followedUsers || []).map(f => f.following_id).filter(id => !blockedIds.has(id));
    });

    const followedTagIds = await cached(`user:${user.id}:tag-follows`, 120, async () => {
      const { data: followedTags } = await admin
        .from('tag_follows')
        .select('tag_id')
        .eq('user_id', user.id);
      return (followedTags || []).map((f: { tag_id: number }) => f.tag_id);
    });
    const followedUserIdSet = new Set(followedUserIds);

    if (followedUserIds.length === 0 && followedTagIds.length === 0) {
      return NextResponse.json({ posts: [], page, hasMore: false });
    }

    // Build query for posts from followed users
    let postIds = new Set<number>();

    if (followedUserIds.length > 0) {
      const { data: userPosts } = await admin
        .from('posts')
        .select('id')
        .in('author_id', followedUserIds)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(100);

      (userPosts || []).forEach(p => postIds.add(p.id));
    }

    if (followedTagIds.length > 0) {
      const { data: tagPosts } = await admin
        .from('post_tags')
        .select('post_id')
        .in('tag_id', followedTagIds);

      if (tagPosts && tagPosts.length > 0) {
        const tagPostIds = tagPosts.map(pt => pt.post_id);
        const { data: validPosts } = await admin
          .from('posts')
          .select('id')
          .in('id', tagPostIds)
          .eq('status', 'published');

        (validPosts || []).forEach(p => postIds.add(p.id));
      }
    }

    const allPostIds = Array.from(postIds);

    if (allPostIds.length === 0) {
      return NextResponse.json({ posts: [], page, hasMore: false });
    }

    // Paginate
    const paginatedIds = allPostIds.slice(offset, offset + FEED_PAGE_SIZE + 1);
    const hasMore = paginatedIds.length > FEED_PAGE_SIZE;
    const pageIds = paginatedIds.slice(0, FEED_PAGE_SIZE);

    if (pageIds.length === 0) {
      return NextResponse.json({ posts: [], page, hasMore: false });
    }

    let feedQuery = admin
      .from('posts')
      .select(`
        id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, published_at, content_type, video_duration, video_thumbnail,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, status, account_private)
      `)
      .in('id', pageIds)
      .eq('status', 'published');

    // Filter out blocked authors
    if (blockedIds.size > 0) {
      feedQuery = feedQuery.not('author_id', 'in', `(${[...blockedIds].join(',')})`);
    }

    const { data: posts } = await feedQuery.order('published_at', { ascending: false });

    // Filter out posts from inactive authors + private accounts not followed
    const filteredPosts = (posts || []).filter((p: any) => {
      const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      const authorStatus = author?.status;
      if (authorStatus && authorStatus !== 'active') return false;
      if (author?.account_private && author?.user_id !== user.id && !followedUserIdSet.has(author?.user_id)) return false;
      return true;
    });

    const response = NextResponse.json({ posts: filteredPosts, page, hasMore });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
