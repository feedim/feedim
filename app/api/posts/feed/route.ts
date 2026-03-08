import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FEED_PAGE_SIZE, FEED_CANDIDATE_POOL, FEED_DISCOVERY_QUALITY_GATE, FEED_MIN_CANDIDATES, FEED_SEEN_PENALTY, FEED_MAX_SEEN_IDS } from '@/lib/constants';
import { cached } from '@/lib/cache';
import { safePage, safeNotInFilter } from '@/lib/utils';
import { getTranslations } from 'next-intl/server';
import {
  computeFeedScore,
  enforceDiversity,
  injectBoosts,
  type FeedCandidate,
  type FeedContext,
  type BoostCandidate,
  type UserTargetProfile,
} from '@/lib/feedAlgorithm';

type FeedSource = NonNullable<FeedCandidate['source']>;
type RelationValue<T> = T | T[] | null;

interface FeedUserIdRow {
  user_id: string;
}

interface FeedAuthorSignalRow {
  user_id: string;
  profile_score: number | null;
  is_verified: boolean | null;
  follower_count: number | null;
  language: string | null;
  country: string | null;
  status?: string | null;
  account_private?: boolean | null;
}

interface FeedTagPostRow {
  post_id: number;
}

interface FeedTagRow {
  post_id: number;
  tag_id: number;
}

interface FeedInterestRow {
  post_id: number;
  interest_id: number;
}

interface FeedTargetProfileRow {
  country: string | null;
  gender: string | null;
  birth_date: string | null;
}

interface FeedBoostStatusRow {
  post_id: number;
  status: string;
}

interface FeedPostAuthor {
  user_id: string;
  name: string | null;
  surname: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  premium_plan: string | null;
  role: string | null;
  status?: string | null;
  account_private?: boolean | null;
}

interface FeedPostRow {
  id: number;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  featured_image: string | null;
  reading_time: number | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  save_count: number | null;
  share_count: number | null;
  published_at: string | null;
  content_type: string | null;
  video_duration: number | null;
  video_thumbnail: string | null;
  video_url: string | null;
  blurhash: string | null;
  visibility?: string | null;
  is_nsfw?: boolean | null;
  moderation_category?: string | null;
  author_id?: string | null;
  profiles: RelationValue<FeedPostAuthor>;
  is_boosted?: boolean;
  boost_status?: string | null;
}

type FeedBoostRow = Omit<BoostCandidate<FeedPostRow>, 'post'>;

function unwrapRelation<T>(value: RelationValue<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function withSource(rows: FeedCandidate[] | null | undefined, source: FeedSource): FeedCandidate[] {
  return (rows || []).map((row) => ({ ...row, source }));
}

function buildAuthorProfileMap(rows: FeedAuthorSignalRow[] | null | undefined): Map<string, FeedAuthorSignalRow> {
  const map = new Map<string, FeedAuthorSignalRow>();
  for (const row of rows || []) {
    map.set(row.user_id, row);
  }
  return map;
}

function buildPostValueMap<Row extends { post_id: number }>(
  rows: Row[] | null | undefined,
  getValue: (row: Row) => number,
): Map<number, number[]> {
  const map = new Map<number, number[]>();
  for (const row of rows || []) {
    if (!map.has(row.post_id)) map.set(row.post_id, []);
    map.get(row.post_id)!.push(getValue(row));
  }
  return map;
}

function orderRowsById<T extends { id: number }>(ids: number[], rows: T[] | null | undefined): T[] {
  const map = new Map<number, T>((rows || []).map((row) => [row.id, row]));
  return ids.map((id) => map.get(id)).filter((row): row is T => Boolean(row));
}

function filterVisiblePosts(posts: FeedPostRow[], viewerId?: string, followedUserIds?: Set<string>): FeedPostRow[] {
  return posts.filter((post) => {
    const author = unwrapRelation(post.profiles);
    if (!author) return false;
    if (author.status && author.status !== 'active') return false;
    if (!author.account_private) return true;
    if (!viewerId) return false;
    if (author.user_id === viewerId) return true;
    return followedUserIds?.has(author.user_id) ?? false;
  });
}

function enrichCandidates(
  candidates: FeedCandidate[],
  authorProfiles: Map<string, FeedAuthorSignalRow>,
  postTagMappings: Map<number, number[]>,
  postInterestMappings: Map<number, number[]>,
  userInterestIds: Set<number>,
  likedTagIds: Set<number>,
  trendingTagIds: Set<number>,
  followedTagIdSet: Set<number> = new Set<number>(),
) {
  for (const candidate of candidates) {
    const profile = authorProfiles.get(candidate.author_id);
    if (profile) {
      candidate.author_profile_score = profile.profile_score || 0;
      candidate.author_is_verified = profile.is_verified || false;
      candidate.author_follower_count = profile.follower_count || 0;
      candidate.author_language = profile.language || undefined;
      candidate.author_country = profile.country || undefined;
    }

    const postTags = postTagMappings.get(candidate.id) || [];
    candidate.matched_tag_count = followedTagIdSet.size > 0
      ? postTags.filter((tagId) => followedTagIdSet.has(tagId)).length
      : 0;
    candidate.matched_liked_tag_count = likedTagIds.size > 0
      ? postTags.filter((tagId) => likedTagIds.has(tagId)).length
      : 0;
    candidate.has_trending_tag = postTags.some((tagId) => trendingTagIds.has(tagId));

    const postInterests = postInterestMappings.get(candidate.id) || [];
    candidate.matched_interest_count = postInterests.filter((interestId) => userInterestIds.has(interestId)).length;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const params = request.nextUrl.searchParams;
    const tab = params.get('tab') || 'for-you';
    const page = safePage(params.get('page'));
    const contentType = params.get('content_type') || '';
    const offset = (page - 1) * FEED_PAGE_SIZE;

    // ─── Guest feed (no auth) ─────────────────────────────────
    if (!user) {
      // Following tab requires auth
      if (tab === 'following') {
        const tErrors = await getTranslations("apiErrors");
        return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
      }
      // Require auth for pagination beyond page 1
      if (page > 1) {
        const tErrors = await getTranslations("apiErrors");
        return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
      }
      return handleGuestFeed(admin, request, tab, page, offset);
    }

    // ─── Cached user data (parallel) ────────────────────────────
    const [userRole, blockedIds, followedUserIds, followedTagIds, likedAuthorIds, userLangCountry, likedTagIds, trendingTagIds] = await Promise.all([
      cached(`user:${user.id}:role`, 30, async () => {
        const { data: profile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
        return profile?.role || 'user';
      }),
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
        return (followedUsers || []).map(f => f.following_id);
      }),
      cached(`user:${user.id}:tag-follows`, 30, async () => {
        const { data: followedTags } = await admin
          .from('tag_follows')
          .select('tag_id')
          .eq('user_id', user.id);
        return (followedTags || []).map((f: { tag_id: number }) => f.tag_id);
      }),
      cached(`user:${user.id}:liked-authors`, 120, async () => {
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
      }),
      cached(`user:${user.id}:lang-country`, 300, async () => {
        const { data: profile } = await admin
          .from('profiles')
          .select('language, country')
          .eq('user_id', user.id)
          .single();
        return { language: profile?.language || '', country: profile?.country || '' };
      }),
      cached(`user:${user.id}:liked-tags`, 120, async () => {
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
      }),
      // Trending tag IDs for feed bonus
      cached('trending-tag-ids', 300, async () => {
        const res = await admin
          .from('tags')
          .select('id')
          .gt('trending_score', 50)
          .order('trending_score', { ascending: false })
          .limit(30);
        return new Set((res.data || []).map((t: { id: number }) => t.id));
      }),
    ]);

    const isStaff = userRole === 'admin' || userRole === 'moderator';
    const followedUserIdSet = new Set(followedUserIds.filter(id => !blockedIds.has(id)));

    if (tab === 'following') {
      return handleFollowingTab(admin, user, page, offset, contentType, followedUserIds, followedTagIds, followedUserIdSet, blockedIds, isStaff, likedAuthorIds, userLangCountry, likedTagIds, trendingTagIds);
    }

    if (tab === 'posts') {
      return handleContentTab(admin, user, page, offset, 'post', 0.65, followedUserIds, followedUserIdSet, blockedIds, isStaff, likedAuthorIds, userLangCountry, likedTagIds, trendingTagIds, followedTagIds);
    }

    if (tab === 'notes') {
      return handleContentTab(admin, user, page, offset, 'note', 0.65, followedUserIds, followedUserIdSet, blockedIds, isStaff, likedAuthorIds, userLangCountry, likedTagIds, trendingTagIds, followedTagIds);
    }

    if (tab === 'videos') {
      return handleContentTab(admin, user, page, offset, 'video', 0.35, followedUserIds, followedUserIdSet, blockedIds, isStaff, likedAuthorIds, userLangCountry, likedTagIds, trendingTagIds, followedTagIds);
    }

    // ─── FOR YOU TAB ────────────────────────────────────────────

    // Get user interests for matching
    const userInterestIds = await cached(`user:${user.id}:interests`, 300, async () => {
      const { data: interests } = await admin
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      return new Set((interests || []).map((i: { interest_id: number }) => i.interest_id));
    });

    // ─── Parse seen_ids from client ──────────────────────────────
    const seenIdsRaw = params.get('seen_ids') || '';
    const seenIds = new Set(
      seenIdsRaw
        .split(',')
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n))
        .slice(0, FEED_MAX_SEEN_IDS)
    );

    // ─── Multi-source candidate generation (tiered) ──────────────
    const candidateFields = 'id, author_id, content_type, published_at, trending_score, quality_score, spam_score, like_count, comment_count, save_count, share_count, view_count, is_nsfw, status';

    // Source 4: Active boosts (always fetch)
    const source4 = await admin
      .from('post_boosts')
      .select('id, post_id, daily_budget, impressions_today, target_countries, target_gender, age_min, age_max')
      .eq('status', 'active')
      .limit(20)
      .then((result) => (result.data || []) as FeedBoostRow[]);

    // Tier definitions
    const tiers = [
      { followDays: 7, followLimit: 40, tagDays: 7, tagLimit: 30, discoveryDays: 30, qualityGate: FEED_DISCOVERY_QUALITY_GATE, discoveryLimit: 50 },
      { followDays: 30, followLimit: 60, tagDays: 30, tagLimit: 50, discoveryDays: 90, qualityGate: 15, discoveryLimit: 80 },
      { followDays: 90, followLimit: 80, tagDays: 90, tagLimit: 60, discoveryDays: null, qualityGate: 0, discoveryLimit: 120 },
    ];

    let candidates: FeedCandidate[] = [];
    let usedTier = -1;

    // Helper: fetch candidates for a tier
    const fetchTierCandidates = async (tier: typeof tiers[number]) => {
      const followCutoff = new Date(Date.now() - tier.followDays * 24 * 3600_000).toISOString();
      const tagCutoff = new Date(Date.now() - tier.tagDays * 24 * 3600_000).toISOString();
      const discoveryCutoff = tier.discoveryDays ? new Date(Date.now() - tier.discoveryDays * 24 * 3600_000).toISOString() : null;

      const [s1, s2, s3] = await Promise.all([
        // Source 1: Followed users
        followedUserIds.length > 0
          ? admin
              .from('posts')
              .select(candidateFields)
              .in('author_id', followedUserIds)
              .in('status', ['published', 'moderation'])
              .gte('published_at', followCutoff)
              .order('published_at', { ascending: false })
              .limit(tier.followLimit)
              .then((result) => withSource((result.data || []) as FeedCandidate[], 'followed'))
          : Promise.resolve([]),

        // Source 2: Followed tags
        followedTagIds.length > 0
          ? admin
              .from('post_tags')
              .select('post_id')
              .in('tag_id', followedTagIds)
              .limit(tier.tagLimit * 3)
              .then(async ({ data: tagPostRows }) => {
                const tagPosts = (tagPostRows || []) as FeedTagPostRow[];
                if (!tagPosts || tagPosts.length === 0) return [];
                const postQuery = admin
                  .from('posts')
                  .select(candidateFields)
                  .in('id', tagPosts.map(tp => tp.post_id))
                  .in('status', ['published', 'moderation'])
                  .gte('published_at', tagCutoff)
                  .order('trending_score', { ascending: false })
                  .limit(tier.tagLimit);
                const { data: tagCandidates } = await postQuery;
                return withSource((tagCandidates || []) as FeedCandidate[], 'tag');
              })
          : Promise.resolve([]),

        // Source 3: Discovery (exclude self + followed users)
        (() => {
          const excludeAuthors = [user.id, ...followedUserIds];
          let q = admin
            .from('posts')
            .select(candidateFields)
            .eq('status', 'published')
            .eq('is_nsfw', false)
            .not('author_id', 'in', safeNotInFilter(excludeAuthors));
          if (discoveryCutoff) q = q.gte('published_at', discoveryCutoff);
          if (tier.qualityGate > 0) q = q.gte('quality_score', tier.qualityGate);
          return q
            .order('trending_score', { ascending: false })
            .limit(tier.discoveryLimit)
            .then((result) => withSource((result.data || []) as FeedCandidate[], 'discovery'));
        })(),
      ]);

      return [...s1, ...s2, ...s3];
    };

    // Helper: deduplicate + filter
    const dedupeAndFilter = (raw: FeedCandidate[]): FeedCandidate[] => {
      const map = new Map<number, FeedCandidate>();
      for (const p of raw) {
        if (!map.has(p.id)) map.set(p.id, p);
      }
      let result = Array.from(map.values());
      result = result.filter(c => {
        if (blockedIds.has(c.author_id)) return false;
        if (c.is_nsfw && c.author_id !== user.id && !isStaff) return false;
        if (c.status === 'moderation' && c.author_id !== user.id && !isStaff) return false;
        return true;
      });
      if (contentType) {
        result = result.filter(c => c.content_type === contentType);
      } else {
        result = result.filter(c => c.content_type !== 'moment');
      }
      return result;
    };

    // Try tiers 0–2
    for (let t = 0; t < tiers.length; t++) {
      const raw = await fetchTierCandidates(tiers[t]);
      candidates = dedupeAndFilter(raw);
      usedTier = t;
      if (candidates.length >= (t < 2 ? FEED_MIN_CANDIDATES : 10)) break;
    }

    // Tier 3: explore fallback — trending all-time (exclude self)
    if (candidates.length < 10) {
      const fallbackRaw = await admin
        .from('posts')
        .select(candidateFields)
        .eq('status', 'published')
        .eq('is_nsfw', false)
        .neq('author_id', user.id)
        .order('trending_score', { ascending: false })
        .limit(100)
        .then((result) => withSource((result.data || []) as FeedCandidate[], 'discovery'));
      // Merge with existing
      candidates = dedupeAndFilter([...candidates.map(c => ({ ...c })), ...fallbackRaw]);
      usedTier = 3;
    }

    if (candidates.length === 0) {
      return NextResponse.json({ posts: [], page, hasMore: false });
    }

    // ─── Enrich candidates (parallel) ───────────────────────────
    const candidateIds = candidates.map(c => c.id);
    const authorIds = [...new Set(candidates.map(c => c.author_id))];

    const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
      // Author profiles batch
      admin
        .from('profiles')
        .select('user_id, profile_score, is_verified, follower_count, language, country')
        .in('user_id', authorIds)
        .then((result) => buildAuthorProfileMap((result.data || []) as FeedAuthorSignalRow[])),

      // Post-tag mappings (needed for followed tags + trending tag bonus)
      (followedTagIds.length > 0 || trendingTagIds.size > 0)
        ? admin
            .from('post_tags')
            .select('post_id, tag_id')
            .in('post_id', candidateIds)
            .then((result) => buildPostValueMap((result.data || []) as FeedTagRow[], (row) => row.tag_id))
        : Promise.resolve(new Map<number, number[]>()),

      // Post-interest mappings
      userInterestIds.size > 0
        ? admin
            .from('post_interests')
            .select('post_id, interest_id')
            .in('post_id', candidateIds)
            .then((result) => buildPostValueMap((result.data || []) as FeedInterestRow[], (row) => row.interest_id))
        : Promise.resolve(new Map<number, number[]>()),
    ]);

    const followedTagIdSet = new Set(followedTagIds);
    enrichCandidates(candidates, authorProfiles, postTagMappings, postInterestMappings, userInterestIds, likedTagIds, trendingTagIds, followedTagIdSet);

    // ─── Score ───────────────────────────────────────────────────
    const ctx: FeedContext = {
      followedUserIds: followedUserIdSet,
      likedAuthorIds,
      blockedIds,
      userId: user.id,
      userLanguage: userLangCountry.language || undefined,
      userCountry: userLangCountry.country || undefined,
      likedTagIds,
    };

    // ─── Seen post handling ─────────────────────────────────────
    let useStrictSeen = candidates.length >= FEED_MIN_CANDIDATES;
    if (useStrictSeen && seenIds.size > 0) {
      // Try removing seen posts, but fall back to penalty if too few remain
      const unseen = candidates.filter(c => !seenIds.has(c.id));
      if (unseen.length >= FEED_MIN_CANDIDATES) {
        candidates = unseen;
      } else {
        // Not enough unseen — keep all, penalize seen instead
        useStrictSeen = false;
      }
    }

    const scored = candidates.map(c => {
      let score = computeFeedScore(c, ctx);
      // Penalize seen posts when we couldn't fully remove them
      if (!useStrictSeen && seenIds.has(c.id)) {
        score -= FEED_SEEN_PENALTY;
      }
      return { candidate: c, score };
    });

    // ─── Diversity enforcement ──────────────────────────────────
    const strictDiversity = candidates.length >= FEED_MIN_CANDIDATES;
    const diversified = enforceDiversity(scored, FEED_CANDIDATE_POOL, strictDiversity);

    // ─── Paginate ───────────────────────────────────────────────
    const paginatedCandidates = diversified.slice(offset, offset + FEED_PAGE_SIZE + 1);
    const hasMore = paginatedCandidates.length > FEED_PAGE_SIZE;
    const pageCandidate = paginatedCandidates.slice(0, FEED_PAGE_SIZE);

    if (pageCandidate.length === 0) {
      return NextResponse.json({ posts: [], page, hasMore: false });
    }

    // ─── Fetch full post data ───────────────────────────────────
    const pageIds = pageCandidate.map(c => c.id);
    const { data: fullPosts } = await admin
      .from('posts')
      .select(`
        id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category,
        profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private),
        post_tags(tag_id, tags(id, name, slug))
      `)
      .in('id', pageIds)
      .in('status', ['published', 'moderation']);

    // Maintain score order
    let orderedPosts = orderRowsById(pageIds, (fullPosts || []) as FeedPostRow[]);
    orderedPosts = filterVisiblePosts(orderedPosts, user.id, followedUserIdSet);

    // ─── Boost injection ────────────────────────────────────────
    let usedBoostIds: number[] = [];
    if (source4.length > 0) {
      // Get boost post data
      const boostPostIds = source4.map((boost) => boost.post_id);
      const { data: boostPosts } = await admin
        .from('posts')
        .select(`
          id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category, author_id,
          profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
        `)
        .in('id', boostPostIds)
        .eq('status', 'published')
        .eq('is_nsfw', false);

      const boostPostMap = new Map<number, FeedPostRow>(((boostPosts || []) as FeedPostRow[]).map((post) => [post.id, post]));
      const boostCandidates: BoostCandidate<FeedPostRow>[] = source4
        .filter((boost) => boostPostMap.has(boost.post_id))
        .map((boost) => ({ ...boost, post: boostPostMap.get(boost.post_id) }));

      // Get user targeting profile
      const userProfile = await cached(`user:${user.id}:profile-target`, 300, async () => {
        const { data: profile } = await admin
          .from('profiles')
          .select('country, gender, birth_date')
          .eq('user_id', user.id)
          .single();
        const targetProfile = profile as FeedTargetProfileRow | null;
        if (!targetProfile) return null;
        let age: number | undefined;
        if (targetProfile.birth_date) {
          age = Math.floor((Date.now() - new Date(targetProfile.birth_date).getTime()) / (365.25 * 24 * 3600_000));
        }
        return {
          country: targetProfile.country || undefined,
          gender: targetProfile.gender || undefined,
          age,
        } as UserTargetProfile;
      });

      const boostResult = injectBoosts(orderedPosts, boostCandidates, userProfile, blockedIds);
      orderedPosts = boostResult.posts;
      usedBoostIds = boostResult.usedBoostIds;
    }

    // ─── Non-blocking boost impression update ───────────────────
    if (usedBoostIds.length > 0) {
      after(async () => {
        try {
          const adminBg = createAdminClient();
          for (const boostId of usedBoostIds) {
            await adminBg.rpc('increment_boost_impressions', { boost_id: boostId });
          }
        } catch {
          // Non-critical
        }
      });
    }

    const response = NextResponse.json({ posts: orderedPosts, page, hasMore });
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// ─── Guest Feed (no auth — trending by country) ──────────────────────

async function handleGuestFeed(
  admin: ReturnType<typeof createAdminClient>,
  request: NextRequest,
  tab: string,
  page: number,
  offset: number,
) {
  // Detect country & language from headers
  const country = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    ''
  ).toUpperCase();
  const language = request.headers.get('x-locale') || 'en';

  // Determine content type filter based on tab
  let contentTypeFilter: string | null = null;
  if (tab === 'posts') contentTypeFilter = 'post';
  else if (tab === 'notes') contentTypeFilter = 'note';
  else if (tab === 'videos') contentTypeFilter = 'video';
  // for-you = all except moments

  const candidateFields = 'id, author_id, content_type, published_at, trending_score, quality_score, spam_score, like_count, comment_count, save_count, share_count, view_count, is_nsfw, status';
  const cutoff30d = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();

  // Fetch trending candidates — prefer same-country authors, fallback to global
  let countryAuthorIds: string[] = [];
  if (country) {
    const { data: countryProfiles } = await admin
      .from('profiles')
      .select('user_id')
      .eq('country', country)
      .eq('status', 'active')
      .order('follower_count', { ascending: false })
      .limit(50);
    countryAuthorIds = ((countryProfiles || []) as FeedUserIdRow[]).map((profile) => profile.user_id);
  }

  // Parallel: country posts + global trending
  const [countryPosts, globalPosts] = await Promise.all([
    // Country-specific posts
    countryAuthorIds.length > 0
      ? (() => {
          let q = admin
            .from('posts')
            .select(candidateFields)
            .in('author_id', countryAuthorIds)
            .eq('status', 'published')
            .eq('is_nsfw', false)
            .gte('published_at', cutoff30d)
            .order('trending_score', { ascending: false })
            .limit(60);
          if (contentTypeFilter) {
            q = q.eq('content_type', contentTypeFilter);
          } else {
            q = q.neq('content_type', 'moment');
          }
          return q.then((result) => withSource((result.data || []) as FeedCandidate[], 'discovery'));
        })()
      : Promise.resolve([]),

    // Global trending fallback
    (() => {
      let q = admin
        .from('posts')
        .select(candidateFields)
        .eq('status', 'published')
        .eq('is_nsfw', false)
        .gte('published_at', cutoff30d)
        .order('trending_score', { ascending: false })
        .limit(80);
      if (contentTypeFilter) {
        q = q.eq('content_type', contentTypeFilter);
      } else {
        q = q.neq('content_type', 'moment');
      }
      return q.then((result) => withSource((result.data || []) as FeedCandidate[], 'discovery'));
    })(),
  ]);

  // Dedupe — country posts first, then global
  const map = new Map<number, FeedCandidate>();
  for (const p of [...countryPosts, ...globalPosts]) {
    if (!map.has(p.id)) map.set(p.id, p as FeedCandidate);
  }
  const candidates = Array.from(map.values());

  if (candidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Enrich with author profiles
  const authorIds = [...new Set(candidates.map(c => c.author_id))];
  const authorProfiles = await admin
    .from('profiles')
    .select('user_id, profile_score, is_verified, follower_count, language, country, status, account_private')
    .in('user_id', authorIds)
    .then((result) => buildAuthorProfileMap((result.data || []) as FeedAuthorSignalRow[]));

  enrichCandidates(candidates, authorProfiles, new Map<number, number[]>(), new Map<number, number[]>(), new Set<number>(), new Set<number>(), new Set<number>());

  // Score with empty social context — only country/language affinity matters
  const ctx: FeedContext = {
    followedUserIds: new Set<string>(),
    likedAuthorIds: new Set<string>(),
    blockedIds: new Set<string>(),
    userId: '',
    userLanguage: language || undefined,
    userCountry: country || undefined,
    likedTagIds: new Set<number>(),
  };

  const scored = candidates.map(c => ({
    candidate: c,
    score: computeFeedScore(c, ctx),
  }));

  const diversified = enforceDiversity(scored, FEED_CANDIDATE_POOL, true);

  // Paginate
  const paginatedCandidates = diversified.slice(offset, offset + FEED_PAGE_SIZE + 1);
  const hasMore = paginatedCandidates.length > FEED_PAGE_SIZE;
  const pageCandidates = paginatedCandidates.slice(0, FEED_PAGE_SIZE);

  if (pageCandidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Fetch full post data
  const pageIds = pageCandidates.map(c => c.id);
  const { data: fullPosts } = await admin
    .from('posts')
    .select(`
      id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
    `)
    .in('id', pageIds)
    .eq('status', 'published');

  let orderedPosts = orderRowsById(pageIds, (fullPosts || []) as FeedPostRow[]);
  orderedPosts = filterVisiblePosts(orderedPosts);

  const response = NextResponse.json({ posts: orderedPosts, page, hasMore });
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

// ─── Content Tab (65% followed, 35% discovery — single content type) ─

async function handleContentTab(
  admin: ReturnType<typeof createAdminClient>,
  user: { id: string },
  page: number,
  offset: number,
  contentTypeFilter: string,
  followedRatio: number,
  followedUserIds: string[],
  followedUserIdSet: Set<string>,
  blockedIds: Set<string>,
  isStaff: boolean,
  likedAuthorIds: Set<string>,
  userLangCountry: { language: string; country: string },
  likedTagIds: Set<number>,
  trendingTagIds: Set<number>,
  followedTagIds: number[] = [],
) {
  const candidateFields = 'id, author_id, content_type, published_at, trending_score, quality_score, spam_score, like_count, comment_count, save_count, share_count, view_count, is_nsfw, status';
  const cutoff30d = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const followedTagIdSet = new Set(followedTagIds);

  // Target counts based on followedRatio
  const poolSize = 100;
  const followedLimit = Math.round(poolSize * followedRatio);
  const discoveryLimit = poolSize - followedLimit;

  // Parallel: user interests + candidate sources
  const [userInterestIds, followedPosts, discoveryPosts] = await Promise.all([
    cached(`user:${user.id}:interests`, 300, async () => {
      const { data: interests } = await admin
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      return new Set((interests || []).map((i: { interest_id: number }) => i.interest_id));
    }),

    // Source 1: Followed users' posts
    followedUserIds.length > 0
      ? admin
          .from('posts')
          .select(candidateFields)
          .in('author_id', followedUserIds)
          .eq('content_type', contentTypeFilter)
          .in('status', ['published', 'moderation'])
          .gte('published_at', cutoff30d)
          .order('published_at', { ascending: false })
          .limit(followedLimit)
          .then((result) => withSource((result.data || []) as FeedCandidate[], 'followed'))
      : Promise.resolve([]),

    // Source 2: Discovery posts (not followed, not self)
    (() => {
      const excludeAuthors = [user.id, ...followedUserIds];
      return admin
        .from('posts')
        .select(candidateFields)
        .eq('content_type', contentTypeFilter)
        .eq('status', 'published')
        .eq('is_nsfw', false)
        .not('author_id', 'in', safeNotInFilter(excludeAuthors))
        .gte('published_at', cutoff30d)
        .order('trending_score', { ascending: false })
        .limit(discoveryLimit)
        .then((result) => withSource((result.data || []) as FeedCandidate[], 'discovery'));
    })(),
  ]);

  // Dedupe + filter
  const map = new Map<number, FeedCandidate>();
  for (const p of [...followedPosts, ...discoveryPosts]) {
    if (!map.has(p.id)) map.set(p.id, p as FeedCandidate);
  }
  const candidates = Array.from(map.values()).filter(c => {
    if (blockedIds.has(c.author_id)) return false;
    if (c.is_nsfw && c.author_id !== user.id && !isStaff) return false;
    if (c.status === 'moderation' && c.author_id !== user.id && !isStaff) return false;
    return true;
  });

  if (candidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Enrichment (parallel)
  const candidateIds = candidates.map(c => c.id);
  const authorIds = [...new Set(candidates.map(c => c.author_id))];

  const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
    admin
      .from('profiles')
      .select('user_id, profile_score, is_verified, follower_count, language, country')
      .in('user_id', authorIds)
      .then((result) => buildAuthorProfileMap((result.data || []) as FeedAuthorSignalRow[])),

    (followedTagIdSet.size > 0 || likedTagIds.size > 0 || trendingTagIds.size > 0)
      ? admin
          .from('post_tags')
          .select('post_id, tag_id')
          .in('post_id', candidateIds)
          .then((result) => buildPostValueMap((result.data || []) as FeedTagRow[], (row) => row.tag_id))
      : Promise.resolve(new Map<number, number[]>()),

    userInterestIds.size > 0
      ? admin
          .from('post_interests')
          .select('post_id, interest_id')
          .in('post_id', candidateIds)
          .then((result) => buildPostValueMap((result.data || []) as FeedInterestRow[], (row) => row.interest_id))
      : Promise.resolve(new Map<number, number[]>()),
  ]);

  enrichCandidates(candidates, authorProfiles, postTagMappings, postInterestMappings, userInterestIds, likedTagIds, trendingTagIds, followedTagIdSet);

  // Score
  const ctx: FeedContext = {
    followedUserIds: followedUserIdSet,
    likedAuthorIds,
    blockedIds,
    userId: user.id,
    userLanguage: userLangCountry.language || undefined,
    userCountry: userLangCountry.country || undefined,
    likedTagIds,
  };

  const scored = candidates.map(c => ({
    candidate: c,
    score: computeFeedScore(c, ctx),
  }));

  // Diversity enforcement
  const diversified = enforceDiversity(scored, FEED_CANDIDATE_POOL, candidates.length >= FEED_MIN_CANDIDATES);

  // Paginate
  const paginatedCandidates = diversified.slice(offset, offset + FEED_PAGE_SIZE + 1);
  const hasMore = paginatedCandidates.length > FEED_PAGE_SIZE;
  const pageCandidates = paginatedCandidates.slice(0, FEED_PAGE_SIZE);

  if (pageCandidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Fetch full post data
  const pageIds = pageCandidates.map(c => c.id);
  const { data: fullPosts } = await admin
    .from('posts')
    .select(`
      id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
    `)
    .in('id', pageIds)
    .in('status', ['published', 'moderation']);

  let orderedPosts = orderRowsById(pageIds, (fullPosts || []) as FeedPostRow[]);
  orderedPosts = filterVisiblePosts(orderedPosts, user.id, followedUserIdSet);

  const response = NextResponse.json({ posts: orderedPosts, page, hasMore });
  response.headers.set('Cache-Control', 'private, max-age=30');
  return response;
}

// ─── Following Tab (enhanced chronological) ──────────────────────────

async function handleFollowingTab(
  admin: ReturnType<typeof createAdminClient>,
  user: { id: string },
  page: number,
  offset: number,
  contentType: string,
  followedUserIds: string[],
  followedTagIds: number[],
  followedUserIdSet: Set<string>,
  blockedIds: Set<string>,
  isStaff: boolean,
  likedAuthorIds: Set<string>,
  userLangCountry: { language: string; country: string },
  likedTagIds: Set<number>,
  trendingTagIds: Set<number>,
) {
  if (followedUserIds.length === 0 && followedTagIds.length === 0) {
    return handleFollowingDiscovery(admin, user, page, offset, contentType, blockedIds, isStaff, likedAuthorIds, userLangCountry, likedTagIds, trendingTagIds);
  }

  const candidateFields = 'id, author_id, content_type, published_at, trending_score, quality_score, spam_score, like_count, comment_count, save_count, share_count, view_count, is_nsfw, status';

  // Fetch candidates: followed users + followed tags (no discovery)
  const [userInterestIds, userPostsResult, tagPostsResult] = await Promise.all([
    cached(`user:${user.id}:interests`, 300, async () => {
      const { data: interests } = await admin
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      return new Set((interests || []).map((i: { interest_id: number }) => i.interest_id));
    }),

    followedUserIds.length > 0
      ? admin
          .from('posts')
          .select(candidateFields)
          .in('author_id', followedUserIds)
          .in('status', ['published', 'moderation'])
          .order('published_at', { ascending: false })
          .limit(100)
          .then((result) => withSource((result.data || []) as FeedCandidate[], 'followed'))
      : Promise.resolve([]),

    followedTagIds.length > 0
      ? admin
          .from('post_tags')
          .select('post_id')
          .in('tag_id', followedTagIds)
          .limit(200)
          .then((result) => (result.data || []) as FeedTagPostRow[])
      : Promise.resolve([] as FeedTagPostRow[]),
  ]);

  // Fetch tag posts full data
  let tagPosts: FeedCandidate[] = [];
  if (tagPostsResult.length > 0) {
    const existingIds = new Set(userPostsResult.map((post) => post.id));
    const tagPostIds = tagPostsResult.map((tagPost) => tagPost.post_id).filter((id) => !existingIds.has(id));
    if (tagPostIds.length > 0) {
      const { data: validPosts } = await admin
        .from('posts')
        .select(candidateFields)
        .in('id', tagPostIds)
        .in('status', ['published', 'moderation']);
      tagPosts = withSource((validPosts || []) as FeedCandidate[], 'tag');
    }
  }

  // Dedupe + filter
  const dedupeMap = new Map<number, FeedCandidate>();
  for (const p of [...userPostsResult, ...tagPosts]) {
    if (!dedupeMap.has(p.id)) dedupeMap.set(p.id, p as FeedCandidate);
  }
  let candidates = Array.from(dedupeMap.values()).filter(c => {
    if (blockedIds.has(c.author_id)) return false;
    if (c.is_nsfw && c.author_id !== user.id && !isStaff) return false;
    if (c.status === 'moderation' && c.author_id !== user.id && !isStaff) return false;
    return true;
  });

  if (contentType) {
    candidates = candidates.filter(c => c.content_type === contentType);
  } else {
    candidates = candidates.filter(c => c.content_type !== 'moment');
  }

  if (candidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Enrichment (parallel)
  const candidateIds = candidates.map(c => c.id);
  const authorIds = [...new Set(candidates.map(c => c.author_id))];
  const followedTagIdSet = new Set(followedTagIds);

  const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
    admin
      .from('profiles')
      .select('user_id, profile_score, is_verified, follower_count, language, country')
      .in('user_id', authorIds)
      .then((result) => buildAuthorProfileMap((result.data || []) as FeedAuthorSignalRow[])),

    (followedTagIds.length > 0 || likedTagIds.size > 0 || trendingTagIds.size > 0)
      ? admin
          .from('post_tags')
          .select('post_id, tag_id')
          .in('post_id', candidateIds)
          .then((result) => buildPostValueMap((result.data || []) as FeedTagRow[], (row) => row.tag_id))
      : Promise.resolve(new Map<number, number[]>()),

    userInterestIds.size > 0
      ? admin
          .from('post_interests')
          .select('post_id, interest_id')
          .in('post_id', candidateIds)
          .then((result) => buildPostValueMap((result.data || []) as FeedInterestRow[], (row) => row.interest_id))
      : Promise.resolve(new Map<number, number[]>()),
  ]);

  enrichCandidates(candidates, authorProfiles, postTagMappings, postInterestMappings, userInterestIds, likedTagIds, trendingTagIds, followedTagIdSet);

  // Score with computeFeedScore
  const ctx: FeedContext = {
    followedUserIds: followedUserIdSet,
    likedAuthorIds,
    blockedIds,
    userId: user.id,
    userLanguage: userLangCountry.language || undefined,
    userCountry: userLangCountry.country || undefined,
    likedTagIds,
  };

  const scored = candidates.map(c => ({
    candidate: c,
    score: computeFeedScore(c, ctx),
  }));

  // Diversity enforcement
  const diversified = enforceDiversity(scored, FEED_CANDIDATE_POOL, candidates.length >= FEED_MIN_CANDIDATES);

  // Paginate
  const paginatedCandidates = diversified.slice(offset, offset + FEED_PAGE_SIZE + 1);
  const hasMore = paginatedCandidates.length > FEED_PAGE_SIZE;
  const pageCandidates = paginatedCandidates.slice(0, FEED_PAGE_SIZE);

  if (pageCandidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false });
  }

  // Fetch full post data
  const pageIds = pageCandidates.map(c => c.id);
  const { data: fullPosts } = await admin
    .from('posts')
    .select(`
      id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
    `)
    .in('id', pageIds)
    .in('status', ['published', 'moderation']);

  let orderedPosts = orderRowsById(pageIds, (fullPosts || []) as FeedPostRow[]);
  orderedPosts = filterVisiblePosts(orderedPosts, user.id, followedUserIdSet);

  // Enrich with is_boosted flag
  if (orderedPosts.length > 0) {
    const enrichPostIds = orderedPosts.map((post) => post.id);
    const { data: activeBoosts } = await admin
      .from('post_boosts')
      .select('post_id, status')
      .in('post_id', enrichPostIds)
      .in('status', ['active', 'paused']);
    const boostMap = new Map<number, string>(((activeBoosts || []) as FeedBoostStatusRow[]).map((boost) => [boost.post_id, boost.status]));
    orderedPosts = orderedPosts.map((post) => ({
      ...post,
      is_boosted: boostMap.has(post.id),
      boost_status: boostMap.get(post.id) || null,
    }));
  }

  const response = NextResponse.json({ posts: orderedPosts, page, hasMore });
  response.headers.set('Cache-Control', 'private, max-age=30');
  return response;
}

// ─── Following Discovery (when user follows nobody) ───────────────────

async function handleFollowingDiscovery(
  admin: ReturnType<typeof createAdminClient>,
  user: { id: string },
  page: number,
  offset: number,
  contentType: string,
  blockedIds: Set<string>,
  isStaff: boolean,
  likedAuthorIds: Set<string>,
  userLangCountry: { language: string; country: string },
  likedTagIds: Set<number>,
  trendingTagIds: Set<number>,
) {
  // Cached signal data
  const [userInterestIds, likedPostLikers] = await Promise.all([
    cached(`user:${user.id}:interests`, 300, async () => {
      const { data: interests } = await admin
        .from('user_interests')
        .select('interest_id')
        .eq('user_id', user.id);
      return new Set((interests || []).map((i: { interest_id: number }) => i.interest_id));
    }),
    // Users who liked the same posts as this user (shared taste)
    cached(`user:${user.id}:liked-post-likers`, 120, async () => {
      const { data: myLikes } = await admin
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (!myLikes || myLikes.length === 0) return new Set<string>();
      const { data: otherLikers } = await admin
        .from('likes')
        .select('user_id')
        .in('post_id', myLikes.map(l => l.post_id))
        .neq('user_id', user.id)
        .limit(200);
      // Count co-likes per user, return top users
      const counts = new Map<string, number>();
      for (const l of (otherLikers || [])) {
        counts.set(l.user_id, (counts.get(l.user_id) || 0) + 1);
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
      return new Set(sorted.map(([uid]) => uid));
    }),
  ]);

  // Author discovery: build a pool of interesting author IDs
  const authorPool = new Set<string>();

  // 1. Shared taste authors (liked same posts)
  for (const uid of likedPostLikers) {
    if (!blockedIds.has(uid)) authorPool.add(uid);
  }

  // 2. Same-interest users
  if (userInterestIds.size > 0) {
    const { data: sameInterestUsers } = await admin
      .from('user_interests')
      .select('user_id')
      .in('interest_id', [...userInterestIds])
      .neq('user_id', user.id)
      .limit(100);
    for (const u of (sameInterestUsers || [])) {
      if (!blockedIds.has(u.user_id)) authorPool.add(u.user_id);
    }
  }

  // 3. Same-country popular users
  if (userLangCountry.country) {
    const { data: countryUsers } = await admin
      .from('profiles')
      .select('user_id')
      .eq('country', userLangCountry.country)
      .eq('status', 'active')
      .neq('user_id', user.id)
      .order('follower_count', { ascending: false })
      .limit(30);
    for (const u of (countryUsers || [])) {
      if (!blockedIds.has(u.user_id)) authorPool.add(u.user_id);
    }
  }

  // 4. Global trending fallback if pool is too small
  if (authorPool.size < 20) {
    const { data: trendingPosts } = await admin
      .from('posts')
      .select('author_id')
      .eq('status', 'published')
      .eq('is_nsfw', false)
      .neq('author_id', user.id)
      .order('trending_score', { ascending: false })
      .limit(50);
    for (const p of (trendingPosts || [])) {
      if (!blockedIds.has(p.author_id)) authorPool.add(p.author_id);
    }
  }

  // Cap at 50 unique authors
  const discoveryAuthors = [...authorPool].slice(0, 50);

  if (discoveryAuthors.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false, is_discovery: true });
  }

  // Fetch posts from discovery authors
  const cutoff30d = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
  const candidateFields = 'id, author_id, content_type, published_at, trending_score, quality_score, spam_score, like_count, comment_count, save_count, share_count, view_count, is_nsfw, status';

  let candidateQuery = admin
    .from('posts')
    .select(candidateFields)
    .in('author_id', discoveryAuthors)
    .eq('status', 'published')
    .eq('is_nsfw', false)
    .gte('published_at', cutoff30d)
    .order('trending_score', { ascending: false })
    .limit(100);

  if (contentType) {
    candidateQuery = candidateQuery.eq('content_type', contentType);
  } else {
    candidateQuery = candidateQuery.neq('content_type', 'moment');
  }

  const { data: rawCandidates } = await candidateQuery;
  let candidates: FeedCandidate[] = withSource((rawCandidates || []) as FeedCandidate[], 'discovery');

  // Filter blocked
  candidates = candidates.filter(c => !blockedIds.has(c.author_id));

  if (candidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false, is_discovery: true });
  }

  // Enrichment (same as for-you)
  const candidateIds = candidates.map(c => c.id);
  const authorIds = [...new Set(candidates.map(c => c.author_id))];

  const [authorProfiles, postTagMappings, postInterestMappings] = await Promise.all([
    admin
      .from('profiles')
      .select('user_id, profile_score, is_verified, follower_count, language, country')
      .in('user_id', authorIds)
      .then((result) => buildAuthorProfileMap((result.data || []) as FeedAuthorSignalRow[])),

    (likedTagIds.size > 0 || trendingTagIds.size > 0)
      ? admin
          .from('post_tags')
          .select('post_id, tag_id')
          .in('post_id', candidateIds)
          .then((result) => buildPostValueMap((result.data || []) as FeedTagRow[], (row) => row.tag_id))
      : Promise.resolve(new Map<number, number[]>()),

    userInterestIds.size > 0
      ? admin
          .from('post_interests')
          .select('post_id, interest_id')
          .in('post_id', candidateIds)
          .then((result) => buildPostValueMap((result.data || []) as FeedInterestRow[], (row) => row.interest_id))
      : Promise.resolve(new Map<number, number[]>()),
  ]);

  enrichCandidates(candidates, authorProfiles, postTagMappings, postInterestMappings, userInterestIds, likedTagIds, trendingTagIds);

  // Score with computeFeedScore
  const ctx: FeedContext = {
    followedUserIds: new Set<string>(), // user follows nobody
    likedAuthorIds,
    blockedIds,
    userId: user.id,
    userLanguage: userLangCountry.language || undefined,
    userCountry: userLangCountry.country || undefined,
    likedTagIds,
  };

  const scored = candidates.map(c => ({
    candidate: c,
    score: computeFeedScore(c, ctx),
  }));

  // Diversity enforcement
  const diversified = enforceDiversity(scored, FEED_CANDIDATE_POOL, candidates.length >= FEED_MIN_CANDIDATES);

  // Paginate
  const paginatedCandidates = diversified.slice(offset, offset + FEED_PAGE_SIZE + 1);
  const hasMore = paginatedCandidates.length > FEED_PAGE_SIZE;
  const pageCandidates = paginatedCandidates.slice(0, FEED_PAGE_SIZE);

  if (pageCandidates.length === 0) {
    return NextResponse.json({ posts: [], page, hasMore: false, is_discovery: true });
  }

  // Fetch full post data
  const pageIds = pageCandidates.map(c => c.id);
  const { data: fullPosts } = await admin
    .from('posts')
    .select(`
      id, title, slug, excerpt, featured_image, reading_time, like_count, comment_count, view_count, save_count, share_count, published_at, content_type, video_duration, video_thumbnail, video_url, blurhash, visibility, is_nsfw, moderation_category,
      profiles!posts_author_id_fkey(user_id, name, surname, full_name, username, avatar_url, is_verified, premium_plan, role, status, account_private)
    `)
    .in('id', pageIds)
    .eq('status', 'published');

  let orderedPosts = orderRowsById(pageIds, (fullPosts || []) as FeedPostRow[]);
  orderedPosts = filterVisiblePosts(orderedPosts);

  const response = NextResponse.json({ posts: orderedPosts, page, hasMore, is_discovery: true });
  response.headers.set('Cache-Control', 'private, max-age=30');
  return response;
}
