import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FEED_PAGE_SIZE } from '@/lib/constants';
import { cached } from '@/lib/cache';
import { safePage } from '@/lib/utils';
import { safeError } from '@/lib/apiError';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const page = safePage(request.nextUrl.searchParams.get('page'));
    const categorySlug = request.nextUrl.searchParams.get('category') || '';
    const tagSlug = request.nextUrl.searchParams.get('tag') || '';
    const sortBy = request.nextUrl.searchParams.get('sort') || 'trending';
    const type = request.nextUrl.searchParams.get('type') || 'posts';
    const contentType = request.nextUrl.searchParams.get('content_type') || '';
    const offset = (page - 1) * FEED_PAGE_SIZE;

    // Get user (optional — explore works for anonymous too)
    const { data: { user } } = await supabase.auth.getUser();

    // Require auth for pagination (page > 1)
    if (page > 1 && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let blockedIds = new Set<string>();
    if (user) {
      blockedIds = await cached(`user:${user.id}:blocks`, 120, async () => {
        const { data: blocks } = await admin
          .from('blocks')
          .select('blocked_id, blocker_id')
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
        return new Set(
          (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
        );
      });
    }

    // Cached categories (5 min TTL)
    const categories = await cached('categories', 300, async () => {
      const { data } = await admin
        .from('categories')
        .select('id, name, slug, post_count')
        .order('post_count', { ascending: false })
        .limit(50);
      return data || [];
    });

    // Build posts query (admin client — published posts are public)
    let query = admin
      .from('posts')
      .select(`
        id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, trending_score, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
      `)
      .eq('status', 'published')
      .order(sortBy === 'latest' ? 'published_at' : 'trending_score', { ascending: false })
      .range(offset, offset + FEED_PAGE_SIZE);

    // Filter by content type (e.g. "video")
    if (contentType) {
      query = query.eq('content_type', contentType);
    } else {
      query = query.neq('content_type', 'moment');
    }

    // Filter by tag if provided
    if (tagSlug) {
      const { data: tag } = await admin
        .from('tags')
        .select('id, name, slug')
        .eq('slug', tagSlug)
        .single();

      if (tag) {
        const { data: tagPostIds } = await admin
          .from('post_tags')
          .select('post_id')
          .eq('tag_id', tag.id);

        // Return users who posted with this tag
        if (type === 'users' && tagPostIds && tagPostIds.length > 0) {
          const { data: tagPosts } = await admin
            .from('posts')
            .select('author_id')
            .in('id', tagPostIds.map(tp => tp.post_id))
            .eq('status', 'published');
          const uniqueAuthorIds = [...new Set((tagPosts || []).map(p => p.author_id))];
          if (uniqueAuthorIds.length > 0) {
            const { data: users } = await admin
              .from('profiles')
              .select('user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, bio')
              .in('user_id', uniqueAuthorIds)
              .eq('status', 'active')
              .neq('account_private', true)
              .order('follower_count', { ascending: false })
              .range(offset, offset + FEED_PAGE_SIZE);
            return NextResponse.json({ users: users || [], tag, page, hasMore: (users || []).length > FEED_PAGE_SIZE });
          }
          return NextResponse.json({ users: [], tag, page, hasMore: false });
        }

        if (tagPostIds && tagPostIds.length > 0) {
          query = query.in('id', tagPostIds.map(tp => tp.post_id));
        } else {
          return NextResponse.json({ posts: [], categories, tag, page, hasMore: false });
        }
      } else {
        return NextResponse.json({ posts: [], categories, tag: null, page, hasMore: false });
      }
    }

    // Filter by category if provided
    if (categorySlug) {
      const category = categories.find((c: { slug: string }) => c.slug === categorySlug);
      if (category) {
        const { data: categoryPostIds } = await admin
          .from('post_categories')
          .select('post_id')
          .eq('category_id', (category as { id: number }).id);

        if (categoryPostIds && categoryPostIds.length > 0) {
          query = query.in('id', categoryPostIds.map(cp => cp.post_id));
        } else {
          return NextResponse.json({ posts: [], categories, page, hasMore: false });
        }
      }
    }

    // Filter out blocked users
    if (blockedIds.size > 0) {
      query = query.not('author_id', 'in', `(${[...blockedIds].join(',')})`);
    }

    // NSFW filter: logged-in users see their own NSFW posts, others see none
    if (user) {
      query = query.or(`is_nsfw.eq.false,author_id.eq.${user.id}`);
    } else {
      query = query.eq('is_nsfw', false);
    }

    const { data: posts, error } = await query;

    if (error) {
      return safeError(error);
    }

    // Get followed user IDs for private account visibility
    let followedIdSet = new Set<string>();
    if (user) {
      const followedIds = await cached(`user:${user.id}:follows`, 120, async () => {
        const { data: followedUsers } = await admin
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        return (followedUsers || []).map(f => f.following_id);
      });
      followedIdSet = new Set(followedIds);
    }

    // Filter out posts from inactive or private authors (own posts + followed always visible)
    const activePosts = (posts || []).filter((p: any) => {
      const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      if (!author) return false;
      if (author.status && author.status !== 'active') return false;
      if (author.account_private && author.user_id !== user?.id && !followedIdSet.has(author.user_id)) return false;
      return true;
    });
    const hasMore = activePosts.length > FEED_PAGE_SIZE;
    let pagePosts = activePosts.slice(0, FEED_PAGE_SIZE);

    // Personalized "For You" scoring when user is logged in
    if (user && !categorySlug && !tagSlug && pagePosts.length > 0) {
      const followedIds = followedIdSet;

      const followedTagIds = await cached(`user:${user.id}:tag-follows`, 120, async () => {
        const { data: followedTags } = await admin
          .from('tag_follows')
          .select('tag_id')
          .eq('user_id', user.id);
        return new Set((followedTags || []).map(f => f.tag_id));
      });

      const likedAuthorIds = await cached(`user:${user.id}:liked-authors`, 600, async () => {
        const { data: recentLikes } = await admin
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!recentLikes || recentLikes.length === 0) return new Set<string>();
        const { data: likedPosts } = await admin
          .from('posts')
          .select('author_id')
          .in('id', recentLikes.map(l => l.post_id));
        return new Set((likedPosts || []).map(p => p.author_id));
      });

      // Get post-tag mappings for scoring
      const postTagMap = new Map<number, number[]>();
      if (followedTagIds.size > 0) {
        const postIds = pagePosts.map((p: any) => p.id);
        const { data: postTags } = await admin
          .from('post_tags')
          .select('post_id, tag_id')
          .in('post_id', postIds);
        for (const pt of (postTags || [])) {
          if (!postTagMap.has(pt.post_id)) postTagMap.set(pt.post_id, []);
          postTagMap.get(pt.post_id)!.push(pt.tag_id);
        }
      }

      // Score each post
      const scored = pagePosts.map((p: any) => {
        let score = p.trending_score || 0;
        const authorId = p.profiles?.user_id;

        if (authorId && followedIds.has(authorId)) score += 200;
        if (authorId && likedAuthorIds.has(authorId)) score += 150;

        const pTags = postTagMap.get(p.id) || [];
        const matchedTagCount = pTags.filter(tid => followedTagIds.has(tid)).length;
        score += matchedTagCount * 100;

        score += Math.min(100, (p.like_count || 0) * 2);
        score += Math.min(80, (p.comment_count || 0) * 5);
        score += Math.min(50, (p.save_count || 0) * 10);

        if (p.published_at) {
          const hoursAgo = (Date.now() - new Date(p.published_at).getTime()) / (1000 * 60 * 60);
          if (hoursAgo < 24) score += Math.round(100 * (1 - hoursAgo / 24));
          else if (hoursAgo < 72) score += 20;
        }

        if (p.profiles?.is_verified) score += 50;

        return { ...p, _score: score };
      });

      scored.sort((a: any, b: any) => b._score - a._score);
      pagePosts = scored.map(({ _score, ...rest }: any) => rest);
    }

    // If tag filter, include tag info in response
    let tagInfo = null;
    if (tagSlug) {
      const { data: tag } = await admin
        .from('tags')
        .select('id, name, slug, post_count')
        .eq('slug', tagSlug)
        .single();
      tagInfo = tag;
    }

    const response = NextResponse.json({
      posts: pagePosts,
      categories,
      tag: tagInfo,
      page,
      hasMore,
    });

    // Cache-Control: public for anonymous, private for logged-in
    if (user) {
      response.headers.set('Cache-Control', 'private, max-age=30');
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }

    return response;
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
