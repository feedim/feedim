import { FEED_BOOST_INTERVAL, FEED_CANDIDATE_POOL } from '@/lib/constants';

// ─── Types ───────────────────────────────────────────────────────────

export interface FeedCandidate {
  id: number;
  author_id: string;
  content_type: string;
  published_at: string;
  trending_score: number;
  quality_score: number;
  spam_score: number;
  like_count: number;
  comment_count: number;
  save_count: number;
  share_count: number;
  view_count: number;
  is_nsfw: boolean;
  status: string;
  // Enriched fields
  author_profile_score?: number;
  author_is_verified?: boolean;
  author_follower_count?: number;
  author_language?: string;
  author_country?: string;
  matched_tag_count?: number;
  matched_liked_tag_count?: number;
  matched_interest_count?: number;
  has_trending_tag?: boolean;
  // Source tracking
  source?: 'followed' | 'tag' | 'discovery';
}

export interface FeedContext {
  followedUserIds: Set<string>;
  likedAuthorIds: Set<string>;
  blockedIds: Set<string>;
  userId: string;
  userLanguage?: string;
  userCountry?: string;
  likedTagIds?: Set<number>;
}

type RelationValue<T> = T | T[] | null;

interface BoostInjectablePost {
  id: number;
  author_id?: string | null;
  profiles?: RelationValue<FeedPostProfile>;
}

export interface BoostCandidate<TPost extends BoostInjectablePost = FeedRenderablePost> {
  id: number;
  post_id: number;
  daily_budget: number;
  impressions_today: number;
  target_countries: string[] | null;
  target_gender: string | null;
  age_min: number | null;
  age_max: number | null;
  // Post data joined
  post?: TPost;
}

export interface UserTargetProfile {
  country?: string;
  gender?: string;
  age?: number;
}

interface FeedPostProfile {
  user_id?: string | null;
}

export interface FeedRenderablePost extends FeedCandidate {
  profiles?: FeedPostProfile | null;
  is_boosted?: boolean;
  is_sponsored?: boolean;
  _boost_id?: number;
}

// ─── Content Type Weights ────────────────────────────────────────────

const CONTENT_TYPE_MULTIPLIERS: Record<string, number> = {
  video: 1.4,
  moment: 1.15,
  note: 1.15,
  post: 1.0,
};

const TARGET_DISTRIBUTION: Record<string, number> = {
  video: 0.35,
  moment: 0.25,
  note: 0.25,
  post: 0.15,
};

// ─── Score Computation ───────────────────────────────────────────────

export function computeFeedScore(
  candidate: FeedCandidate,
  ctx: FeedContext,
): number {
  let score = 0;

  // 1. Base score from trending cron
  score += Math.min(candidate.trending_score || 0, 500) * 0.3;

  // 2. Freshness — sigmoid curve (0h: 300pt, 6h: ~50%, 24h: ~10%)
  const hoursAgo = candidate.published_at
    ? Math.max(0.1, (Date.now() - new Date(candidate.published_at).getTime()) / 3_600_000)
    : 999;
  score += 300 / (1 + Math.pow(hoursAgo / 6, 1.8));

  // 3. Affinity
  const authorId = candidate.author_id;
  if (ctx.followedUserIds.has(authorId)) score += 250;
  if (ctx.likedAuthorIds.has(authorId)) score += 180;
  score += (candidate.matched_tag_count || 0) * 120;
  score += (candidate.matched_liked_tag_count || 0) * 80;
  score += (candidate.matched_interest_count || 0) * 100;

  // 3b. Language & country affinity
  if (ctx.userLanguage && candidate.author_language && ctx.userLanguage === candidate.author_language) {
    score += 100;
  }
  if (ctx.userCountry && candidate.author_country && ctx.userCountry === candidate.author_country) {
    score += candidate.source === 'discovery' ? 80 : 40;
  }

  // 3c. Trending tag bonus — fresh content with trending tags
  if (candidate.has_trending_tag && hoursAgo <= 24) {
    score += 60;
  }

  // 4. Content quality
  score += (candidate.quality_score || 0) * 1.5; // 0–150
  score += (candidate.author_profile_score || 0) * 0.8; // 0–80

  // 5. Verified bonus (before multiplier so it scales with content type)
  if (candidate.author_is_verified) score += 60;

  // 6. Engagement velocity (last 48h)
  if (hoursAgo <= 48) {
    const velocity =
      ((candidate.like_count || 0) * 2 +
        (candidate.comment_count || 0) * 5 +
        (candidate.save_count || 0) * 10 +
        (candidate.share_count || 0) * 8) /
      hoursAgo;
    score += Math.min(velocity * 2, 150);
  }

  // 7. Discovery bonus (non-followed quality accounts)
  if (!ctx.followedUserIds.has(authorId) && candidate.source === 'discovery') {
    score += (candidate.quality_score || 0) * 0.5;
    score += (candidate.author_profile_score || 0) * 0.3;
    if (candidate.author_is_verified) score += 40;
    score += Math.min((candidate.author_follower_count || 0) / 100, 50);
  }

  // 8. Spam penalty
  const spamScore = candidate.spam_score || 0;
  if (spamScore > 20) {
    score *= Math.max(0.1, 1 - spamScore / 100);
  }

  // 9. Content type multiplier
  const typeMultiplier = CONTENT_TYPE_MULTIPLIERS[candidate.content_type] ?? 1;
  score *= typeMultiplier;

  // 10. Jitter for varied ordering
  score += Math.random() * 30;

  // 11. Gradual reach — new discovery posts start at 20% visibility,
  //     escalate based on engagement rate and time (Instagram-like seed audience)
  const isDiscoveryPost = !ctx.followedUserIds.has(authorId);
  if (isDiscoveryPost && hoursAgo < 6) {
    let reachProb = 0.20;

    // Trusted authors bypass partially
    if (candidate.author_is_verified) reachProb = Math.max(reachProb, 0.50);
    else if ((candidate.author_profile_score || 0) >= 70) reachProb = Math.max(reachProb, 0.40);

    // Engagement-based escalation
    const totalEng = (candidate.like_count || 0) +
      (candidate.comment_count || 0) * 2 +
      (candidate.save_count || 0) * 2 +
      (candidate.share_count || 0) * 2;
    const views = Math.max(1, candidate.view_count || 1);
    const engRate = totalEng / views;

    if (engRate > 0.05) reachProb = Math.max(reachProb, 0.50);
    if (engRate > 0.10) reachProb = Math.max(reachProb, 0.80);
    if (totalEng >= 20) reachProb = 1.0;

    // Time-based escalation
    if (hoursAgo >= 3) reachProb = Math.max(reachProb, 0.60);

    // Trending content bypasses reach gate
    if ((candidate.trending_score || 0) > 50) reachProb = 1.0;

    // Random roll — failed = effectively hidden (95% score penalty)
    if (Math.random() > reachProb) {
      score *= 0.05;
    }
  }

  return Math.round(score * 100) / 100;
}

// ─── Diversity Enforcement ───────────────────────────────────────────

export function enforceDiversity(
  scored: { candidate: FeedCandidate; score: number }[],
  targetSize: number,
  strict: boolean = true,
): FeedCandidate[] {
  const result: FeedCandidate[] = [];
  const typeCounts: Record<string, number> = {};
  const authorLastIndex: Record<string, number> = {};

  // Sort by score descending
  const sorted = [...scored].sort((a, b) => b.score - a.score);

  if (!strict) {
    // Relaxed: author spacing 1, no type cap, just score order
    for (const { candidate } of sorted) {
      if (result.length >= targetSize) break;

      const lastIdx = authorLastIndex[candidate.author_id];
      if (lastIdx !== undefined && result.length - lastIdx < 2) continue;

      result.push(candidate);
      authorLastIndex[candidate.author_id] = result.length - 1;
    }
  } else {
    // Strict: type cap + author spacing 3
    const maxCap = 2.2;
    for (const { candidate } of sorted) {
      if (result.length >= targetSize) break;

      const ct = candidate.content_type || 'post';
      const currentCount = typeCounts[ct] || 0;
      const targetRatio = TARGET_DISTRIBUTION[ct] ?? 0.15;
      const maxForType = Math.ceil(targetSize * targetRatio * maxCap);

      if (currentCount >= maxForType) continue;

      const lastIdx = authorLastIndex[candidate.author_id];
      if (lastIdx !== undefined && result.length - lastIdx < 3) continue;

      result.push(candidate);
      typeCounts[ct] = currentCount + 1;
      authorLastIndex[candidate.author_id] = result.length - 1;
    }
  }

  // Backfill if we didn't reach targetSize
  if (result.length < targetSize) {
    const usedIds = new Set(result.map(r => r.id));
    for (const { candidate } of sorted) {
      if (result.length >= targetSize) break;
      if (usedIds.has(candidate.id)) continue;
      result.push(candidate);
      usedIds.add(candidate.id);
    }
  }

  return result;
}

// ─── Boost Selection ─────────────────────────────────────────────────

export function selectBoostForSlot<TPost extends BoostInjectablePost>(
  boosts: BoostCandidate<TPost>[],
  usedBoostIds: Set<number>,
  userProfile: UserTargetProfile | null,
): BoostCandidate<TPost> | null {
  if (boosts.length === 0) return null;

  // Filter: not already shown + targeting match
  const eligible = boosts.filter(b => {
    if (usedBoostIds.has(b.id)) return false;

    // Country targeting — skip boost if user country unknown and boost targets specific countries
    if (b.target_countries && b.target_countries.length > 0) {
      if (!userProfile?.country) return false;
      if (!b.target_countries.includes(userProfile.country)) return false;
    }

    // Gender targeting — skip boost if user gender unknown and boost targets specific gender
    if (b.target_gender) {
      if (!userProfile?.gender) return false;
      if (b.target_gender !== userProfile.gender) return false;
    }

    // Age targeting — skip boost if user age unknown and boost targets specific age range
    if (b.age_min || b.age_max) {
      if (!userProfile?.age) return false;
      if (b.age_min && userProfile.age < b.age_min) return false;
      if (b.age_max && userProfile.age > b.age_max) return false;
    }

    return true;
  });

  if (eligible.length === 0) return null;

  // Weighted random: higher budget / lower impressions = higher weight
  const weights = eligible.map(b => {
    const budgetRemaining = Math.max(1, b.daily_budget - (b.impressions_today || 0));
    return budgetRemaining;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let rand = Math.random() * totalWeight;

  for (let i = 0; i < eligible.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return eligible[i];
  }

  return eligible[0];
}

// ─── Boost Injection ─────────────────────────────────────────────────

export function injectBoosts<TPost extends BoostInjectablePost>(
  posts: TPost[],
  boosts: BoostCandidate<TPost>[],
  userProfile: UserTargetProfile | null,
  blockedIds: Set<string>,
): { posts: Array<TPost & { is_boosted?: boolean; is_sponsored?: boolean; _boost_id?: number }>; usedBoostIds: number[] } {
  if (boosts.length === 0 || posts.length === 0) {
    return { posts, usedBoostIds: [] };
  }

  const result: Array<TPost & { is_boosted?: boolean; is_sponsored?: boolean; _boost_id?: number }> = [...posts];
  const usedBoostIds = new Set<number>();
  const usedBoostIdList: number[] = [];

  // Insert at every FEED_BOOST_INTERVAL position
  for (let i = FEED_BOOST_INTERVAL - 1; i < result.length; i += FEED_BOOST_INTERVAL + 1) {
    const boost = selectBoostForSlot(boosts, usedBoostIds, userProfile);
    if (!boost || !boost.post) break;

    // Skip if boost author is blocked
    const boostProfile = Array.isArray(boost.post.profiles) ? boost.post.profiles[0] : boost.post.profiles;
    const boostAuthorId = boost.post.author_id || boostProfile?.user_id;
    if (boostAuthorId && blockedIds.has(boostAuthorId)) continue;

    usedBoostIds.add(boost.id);
    usedBoostIdList.push(boost.id);

    const sponsoredPost: TPost & { is_boosted?: boolean; is_sponsored?: boolean; _boost_id?: number } = {
      ...boost.post,
      is_boosted: true,
      is_sponsored: true,
      _boost_id: boost.id,
    };

    result.splice(i, 0, sponsoredPost);
  }

  return { posts: result, usedBoostIds: usedBoostIdList };
}
