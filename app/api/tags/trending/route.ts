import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cached } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const country = params.get('country') || '';
    const lang = params.get('lang') || '';
    const limit = Math.min(parseInt(params.get('limit') || '10', 10) || 10, 30);

    const cacheKey = `trending-tags:${country}:${lang}:${limit}`;
    const result = await cached(cacheKey, 300, async () => {
      const admin = createAdminClient();

      const cutoff72h = new Date(Date.now() - 72 * 3600_000).toISOString();
      const cutoff24h = new Date(Date.now() - 24 * 3600_000).toISOString();

      // Get recent posts (72h) with engagement data
      let postsQuery = admin
        .from('posts')
        .select('id, like_count, comment_count, save_count, share_count, published_at, author_id')
        .eq('status', 'published')
        .gte('published_at', cutoff72h);

      const { data: posts } = await postsQuery;
      if (!posts || posts.length === 0) {
        return { tags: [] };
      }

      // If country filter, get author profiles and filter
      let filteredPostIds: Set<number>;
      if (country) {
        const authorIds = [...new Set(posts.map(p => p.author_id))];
        const { data: profiles } = await admin
          .from('profiles')
          .select('user_id, country')
          .in('user_id', authorIds)
          .eq('country', country);
        const countryAuthorIds = new Set((profiles || []).map(p => p.user_id));
        filteredPostIds = new Set(posts.filter(p => countryAuthorIds.has(p.author_id)).map(p => p.id));
      } else {
        filteredPostIds = new Set(posts.map(p => p.id));
      }

      if (filteredPostIds.size === 0) {
        return { tags: [] };
      }

      // Get post-tag mappings
      const postIdArr = [...filteredPostIds];
      const { data: postTags } = await admin
        .from('post_tags')
        .select('post_id, tag_id')
        .in('post_id', postIdArr);

      if (!postTags || postTags.length === 0) {
        return { tags: [] };
      }

      // Build post lookup for engagement
      const postMap = new Map(posts.map(p => [p.id, p]));

      // Aggregate per tag
      const tagStats = new Map<number, { postCount: number; engagement: number; recentPostCount: number; olderPostCount: number }>();

      for (const pt of postTags) {
        if (!filteredPostIds.has(pt.post_id)) continue;
        const post = postMap.get(pt.post_id);
        if (!post) continue;

        const stats = tagStats.get(pt.tag_id) || { postCount: 0, engagement: 0, recentPostCount: 0, olderPostCount: 0 };
        stats.postCount++;
        stats.engagement += (post.like_count || 0) * 2 + (post.comment_count || 0) * 5 + (post.save_count || 0) * 10 + (post.share_count || 0) * 8;
        if (post.published_at >= cutoff24h) {
          stats.recentPostCount++;
        } else {
          stats.olderPostCount++;
        }
        tagStats.set(pt.tag_id, stats);
      }

      // Score tags with velocity
      const tagScores = Array.from(tagStats.entries()).map(([tagId, stats]) => {
        const velocity = stats.recentPostCount / Math.max(1, stats.olderPostCount);
        const score = stats.postCount * 10 + stats.engagement * 0.1 + stats.recentPostCount * 30 + velocity * 20;
        return {
          tagId,
          score,
          recentPostCount: stats.recentPostCount,
          velocity: Math.round(velocity * 100) / 100,
        };
      });

      tagScores.sort((a, b) => b.score - a.score);
      const topTagIds = tagScores.slice(0, limit);

      if (topTagIds.length === 0) {
        return { tags: [] };
      }

      // Fetch tag details
      const { data: tagDetails } = await admin
        .from('tags')
        .select('id, name, slug, post_count, trending_score, language')
        .in('id', topTagIds.map(t => t.tagId));

      const tagDetailMap = new Map((tagDetails || []).map(t => [t.id, t]));

      const tags = topTagIds
        .map(ts => {
          const detail = tagDetailMap.get(ts.tagId);
          if (!detail) return null;
          // Language filter: show tags matching requested lang OR global tags
          if (lang && detail.language && detail.language !== lang && detail.language !== 'global') return null;
          return {
            id: detail.id,
            name: detail.name,
            slug: detail.slug,
            post_count: detail.post_count || 0,
            trending_score: ts.score,
            recent_post_count: ts.recentPostCount,
            language: detail.language || null,
            velocity: ts.velocity,
          };
        })
        .filter(Boolean);

      return { tags };
    });

    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return response;
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
