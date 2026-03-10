import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FEED_PAGE_SIZE } from '@/lib/constants';
import { cached } from '@/lib/cache';
import { safePage, safeNotInFilter } from '@/lib/utils';
import { safeError } from '@/lib/apiError';
import { getTranslations } from 'next-intl/server';
import { attachViewerPostInteractions } from '@/lib/postViewerInteractions';
import {
  computeFeedScore,
  type FeedCandidate,
  type FeedContext,
} from '@/lib/feedAlgorithm';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const page = safePage(request.nextUrl.searchParams.get('page'));
    const tagSlug = request.nextUrl.searchParams.get('tag') || '';
    const sortBy = request.nextUrl.searchParams.get('sort') || 'trending';
    const type = request.nextUrl.searchParams.get('type') || 'posts';
    const contentType = request.nextUrl.searchParams.get('content_type') || '';
    const offset = (page - 1) * FEED_PAGE_SIZE;

    // Get user (optional — explore works for anonymous too)
    const { data: { user } } = await supabase.auth.getUser();

    // Require auth for pagination (page > 1)
    if (page > 1 && !user) {
      const tErrors = await getTranslations("apiErrors");
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    // Check staff role for NSFW visibility
    let isStaff = false;
    if (user) {
      const { data: userProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
      isStaff = userProfile?.role === 'admin' || userProfile?.role === 'moderator';
    }

    let blockedIds = new Set<string>();
    let followedIdSet = new Set<string>();
    if (user) {
      [blockedIds, followedIdSet] = await Promise.all([
        cached(`user:${user.id}:blocks`, 30, async () => {
          const { data: blocks } = await admin
            .from('blocks')
            .select('blocked_id, blocker_id')
            .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
          return new Set(
            (blocks || []).map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id)
          );
        }),
        cached(`user:${user.id}:follows`, 30, async () => {
          const { data: followedUsers } = await admin
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id);
          return new Set((followedUsers || []).map(f => f.following_id));
        }),
      ]);
    }

    // Build posts query (admin client — published posts are public)
    let query = admin
      .from('posts')
      .select(`
        id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, trending_score, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private),
        post_tags(tag_id, tags(id, name, slug))
      `)
      .in('status', ['published', ...(user ? ['moderation'] : [])])
      .order(sortBy === 'latest' ? 'published_at' : 'trending_score', { ascending: false })
      .range(offset, offset + FEED_PAGE_SIZE);

    // Filter by content type (e.g. "video")
    if (contentType) {
      query = query.eq('content_type', contentType);
    } else if (!tagSlug) {
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
          return NextResponse.json({ posts: [], tag, page, hasMore: false });
        }
      } else {
        return NextResponse.json({ posts: [], tag: null, page, hasMore: false });
      }
    }

    // Filter out blocked users
    if (blockedIds.size > 0) {
      query = query.not('author_id', 'in', safeNotInFilter([...blockedIds]));
    }

    // Explore = discovery-focused: exclude self + followed users' posts (unless tag filter)
    if (user && !tagSlug) {
      const excludeIds = [user.id, ...followedIdSet];
      query = query.not('author_id', 'in', safeNotInFilter(excludeIds));
    }

    // NSFW + moderation filter: author and staff see flagged/moderation posts, others see none
    if (isStaff) {
      // Staff sees all posts including NSFW and moderation
    } else if (user) {
      query = query.or(`and(is_nsfw.eq.false,status.eq.published),author_id.eq.${user.id}`);
    } else {
      query = query.eq('is_nsfw', false);
    }

    const { data: posts, error } = await query;

    if (error) {
      return safeError(error);
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

    // Personalized scoring with computeFeedScore
    if (pagePosts.length > 0) {
      // Cached user signals (parallel) — works for both logged-in and anonymous
      const [followedTagIds, likedAuthorIds, likedTagIds, trendingTagIdSet, userInterestIds, userLangCountry] = await Promise.all([
        user ? cached(`user:${user.id}:tag-follows`, 30, async () => {
          const { data: followedTags } = await admin
            .from('tag_follows')
            .select('tag_id')
            .eq('user_id', user.id);
          return new Set((followedTags || []).map((f: { tag_id: number }) => f.tag_id));
        }) : Promise.resolve(new Set<number>()),

        user ? cached(`user:${user.id}:liked-authors`, 600, async () => {
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
        }) : Promise.resolve(new Set<string>()),

        user ? cached(`user:${user.id}:liked-tags`, 600, async () => {
          const { data: recentLikes } = await admin
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(100);
          if (!recentLikes || recentLikes.length === 0) return new Set<number>();
          const { data: likedPostTags } = await admin
            .from('post_tags')
            .select('tag_id')
            .in('post_id', recentLikes.map(l => l.post_id));
          return new Set((likedPostTags || []).map((pt: { tag_id: number }) => pt.tag_id));
        }) : Promise.resolve(new Set<number>()),

        cached('trending-tag-ids', 300, async () => {
          const res = await admin
            .from('tags')
            .select('id')
            .gt('trending_score', 50)
            .order('trending_score', { ascending: false })
            .limit(30);
          return new Set((res.data || []).map((t: { id: number }) => t.id));
        }),

        user ? cached(`user:${user.id}:interests`, 300, async () => {
          const { data: interests } = await admin
            .from('user_interests')
            .select('interest_id')
            .eq('user_id', user.id);
          return new Set((interests || []).map((i: { interest_id: number }) => i.interest_id));
        }) : Promise.resolve(new Set<number>()),

        user ? cached(`user:${user.id}:lang-country`, 300, async () => {
          const { data: profile } = await admin
            .from('profiles')
            .select('language, country')
            .eq('user_id', user.id)
            .single();
          return { language: profile?.language || '', country: profile?.country || '' };
        }) : Promise.resolve({ language: '', country: '' }),
      ]);

      // Convert pagePosts to FeedCandidate format
      const postIds = pagePosts.map((p: any) => p.id);
      const authorIds = [...new Set(pagePosts.map((p: any) => {
        const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return author?.user_id;
      }).filter(Boolean))] as string[];

      // Enrichment (parallel)
      const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
        admin
          .from('profiles')
          .select('user_id, profile_score, is_verified, follower_count, language, country')
          .in('user_id', authorIds)
          .then(r => {
            const map = new Map<string, any>();
            for (const p of (r.data || [])) map.set(p.user_id, p);
            return map;
          }),

        (followedTagIds.size > 0 || likedTagIds.size > 0 || trendingTagIdSet.size > 0)
          ? admin
              .from('post_tags')
              .select('post_id, tag_id')
              .in('post_id', postIds)
              .then(r => {
                const map = new Map<number, number[]>();
                for (const pt of (r.data || [])) {
                  if (!map.has(pt.post_id)) map.set(pt.post_id, []);
                  map.get(pt.post_id)!.push(pt.tag_id);
                }
                return map;
              })
          : Promise.resolve(new Map<number, number[]>()),

        userInterestIds.size > 0
          ? admin
              .from('post_interests')
              .select('post_id, interest_id')
              .in('post_id', postIds)
              .then(r => {
                const map = new Map<number, number[]>();
                for (const pi of (r.data || [])) {
                  if (!map.has(pi.post_id)) map.set(pi.post_id, []);
                  map.get(pi.post_id)!.push(pi.interest_id);
                }
                return map;
              })
          : Promise.resolve(new Map<number, number[]>()),
      ]);

      const followedTagIdSet = new Set(followedTagIds);

      // Build FeedContext
      const ctx: FeedContext = {
        followedUserIds: followedIdSet,
        likedAuthorIds,
        blockedIds,
        userId: user?.id || '',
        userLanguage: userLangCountry.language || undefined,
        userCountry: userLangCountry.country || undefined,
        likedTagIds,
      };

      // Score and re-sort
      const scored = pagePosts.map((p: any) => {
        const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        const authorId = author?.user_id || '';
        const profile = authorProfiles.get(authorId);
        const pTags = postTagMappings.get(p.id) || [];
        const pInterests = postInterestMappings.get(p.id) || [];

        const candidate: FeedCandidate = {
          id: p.id,
          author_id: authorId,
          content_type: p.content_type || 'post',
          published_at: p.published_at || '',
          trending_score: p.trending_score || 0,
          quality_score: p.quality_score || 0,
          spam_score: p.spam_score || 0,
          like_count: p.like_count || 0,
          comment_count: p.comment_count || 0,
          save_count: p.save_count || 0,
          share_count: p.share_count || 0,
          view_count: p.view_count || 0,
          is_nsfw: p.is_nsfw || false,
          status: 'published',
          source: 'discovery',
          author_profile_score: profile?.profile_score || 0,
          author_is_verified: profile?.is_verified || false,
          author_follower_count: profile?.follower_count || 0,
          author_language: profile?.language || undefined,
          author_country: profile?.country || undefined,
          matched_tag_count: pTags.filter(tid => followedTagIdSet.has(tid)).length,
          matched_liked_tag_count: likedTagIds.size > 0 ? pTags.filter(tid => likedTagIds.has(tid)).length : 0,
          has_trending_tag: pTags.some(tid => trendingTagIdSet.has(tid)),
          matched_interest_count: pInterests.filter(iid => userInterestIds.has(iid)).length,
        };

        return { post: p, score: computeFeedScore(candidate, ctx) };
      });

      scored.sort((a: any, b: any) => b.score - a.score);
      pagePosts = scored.map(({ post }: any) => post);
    }

    // Enrich with is_boosted flag
    if (pagePosts.length > 0) {
      const postIds = pagePosts.map((p: any) => p.id);
      const { data: activeBoosts } = await admin
        .from('post_boosts')
        .select('post_id, status')
        .in('post_id', postIds)
        .in('status', ['active', 'paused']);
      const boostMap = new Map((activeBoosts || []).map((b: any) => [b.post_id, b.status]));
      pagePosts = pagePosts.map((p: any) => ({
        ...p,
        is_boosted: boostMap.has(p.id),
        boost_status: boostMap.get(p.id) || null,
      }));
    }

    if (user) {
      pagePosts = await attachViewerPostInteractions(pagePosts, user.id, admin);
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
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
