import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getUserPlan, checkDailyLimit, logRateLimitHit, COMMENT_CHAR_LIMITS } from '@/lib/limits';
import { checkTextContent } from '@/lib/moderation';
import { safePage } from '@/lib/utils';
import { safeError } from '@/lib/apiError';

function isValidGifUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'giphy.com' || host.endsWith('.giphy.com') || host === 'tenor.com' || host.endsWith('.tenor.com');
  } catch { return false; }
}

interface ScoringInput {
  likeCount: number;
  replyCount: number;
  profileScore: number;
  spamScore: number;
  isVerified: boolean;
  isPremium: boolean;
  contentLength: number; // word count
  isGif: boolean;
  ageHours: number;
  hasSelfLike: boolean;
}

function scorePopular(c: ScoringInput): number {
  // ENGAGEMENT (max 40)
  const authorCredibility = Math.max(0.2, c.profileScore / 100);
  const effectiveLikes = c.likeCount * authorCredibility;
  const likeScore = Math.min(25, effectiveLikes * 3);
  const replyScore = Math.min(15, c.replyCount * 5);
  const engagement = likeScore + replyScore;

  // AUTHOR TRUST (max 25)
  let trust = (c.profileScore / 100) * 20;
  if (c.isVerified) trust += 3;
  if (c.isPremium) trust += 2;
  trust = Math.min(25, trust);

  // CONTENT QUALITY (max 15)
  let content = 0;
  if (c.isGif) { content = 3; }
  else if (c.contentLength < 5) { content = 2; }
  else if (c.contentLength <= 10) { content = 5; }
  else if (c.contentLength <= 30) { content = 10; }
  else if (c.contentLength <= 80) { content = 15; }
  else { content = 12; }

  // FRESHNESS (max 10)
  let freshness = 0;
  if (c.ageHours < 1) freshness = 10;
  else if (c.ageHours < 6) freshness = 8;
  else if (c.ageHours < 24) freshness = 5;
  else if (c.ageHours < 72) freshness = 2;

  // PENALTIES
  const spamPenalty = (c.spamScore / 100) * 40;
  const selfLikePenalty = c.hasSelfLike ? 8 : 0;
  const noEngagementPenalty = (c.likeCount === 0 && c.replyCount === 0) ? 30 : 0;

  return engagement + trust + content + freshness - spamPenalty - selfLikePenalty - noEngagementPenalty;
}

function scoreSmart(c: ScoringInput): number {
  // RECENCY (max 35)
  let recency = 0;
  if (c.ageHours < 0.5) recency = 35;
  else if (c.ageHours < 1) recency = 30;
  else if (c.ageHours < 3) recency = 25;
  else if (c.ageHours < 6) recency = 20;
  else if (c.ageHours < 12) recency = 15;
  else if (c.ageHours < 24) recency = 10;
  else if (c.ageHours < 72) recency = 5;

  // ENGAGEMENT (max 25)
  const engagement = Math.min(25, c.likeCount * 2.5 + c.replyCount * 5);

  // AUTHOR QUALITY (max 20)
  let author = (c.profileScore / 100) * 15;
  if (c.isVerified) author += 3;
  if (c.isPremium) author += 2;
  author = Math.min(20, author);

  // CONTENT SUBSTANCE (max 10)
  let substance = 0;
  if (c.isGif) { substance = 2; }
  else if (c.contentLength >= 10) { substance = 10; }
  else if (c.contentLength >= 5) { substance = 6; }
  else { substance = 2; }

  // CONVERSATION STARTER (max 10)
  let conversation = 0;
  if (c.replyCount >= 5) conversation = 10;
  else if (c.replyCount >= 3) conversation = 7;
  else if (c.replyCount >= 1) conversation = 3;

  // PENALTY
  const spamPenalty = (c.spamScore / 100) * 35;

  return recency + engagement + author + substance + conversation - spamPenalty;
}

function wordCount(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const page = safePage(request.nextUrl.searchParams.get('page'));
    const sort = request.nextUrl.searchParams.get('sort') || 'newest';
    const limit = 10;
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    // Get blocked user IDs for current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Require auth for pagination (page > 1)
    if (page > 1 && !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let blockedIds: string[] = [];
    if (user) {
      const { data: blocks } = await admin
        .from('blocks')
        .select('blocked_id, blocker_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      if (blocks) {
        blockedIds = blocks.map(b => b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
      }
    }

    // Staff check (needed for reply pagination and comment filtering)
    let isStaffViewer = false;
    if (user) {
      const { data: viewerP } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
      isStaffViewer = viewerP?.role === 'admin' || viewerP?.role === 'moderator';
    }

    // Reply pagination: GET /api/posts/{id}/comments?parent_id=123&offset=5&limit=10
    const parentIdParam = request.nextUrl.searchParams.get('parent_id');
    if (parentIdParam) {
      const parentId = parseInt(parentIdParam);
      if (isNaN(parentId)) return NextResponse.json({ error: 'Invalid parent ID' }, { status: 400 });
      const replyLimit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10') || 10, 20);
      const replyOffset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;

      let replyQuery = admin
        .from('comments')
        .select(`id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw, profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status, profile_score, spam_score)`)
        .eq('parent_id', parentId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .range(replyOffset, replyOffset + replyLimit);

      if (blockedIds.length > 0) {
        replyQuery = replyQuery.not('author_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data: replies, error: replyError } = await replyQuery;
      if (replyError) return safeError(replyError);

      const filteredReplies = (replies || []).filter((r: any) => {
        if (isStaffViewer) return true;
        const rProfile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        if (rProfile?.status && rProfile.status !== 'active') return false;
        if (r.is_nsfw && r.author_id !== user?.id) return false;
        return true;
      }).map((r: any) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        const { profile_score, spam_score, ...cleanProfile } = profile || {};
        return { ...r, profiles: profile ? cleanProfile : profile };
      });

      const resultReplies = filteredReplies.slice(0, replyLimit);
      return NextResponse.json({ replies: resultReplies, hasMore: filteredReplies.length > replyLimit });
    }

    let query = admin
      .from('comments')
      .select(`
        id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw,
        profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status, profile_score, spam_score)
      `)
      .eq('post_id', postId)
      .is('parent_id', null)
      .eq('status', 'approved');

    // Filter out blocked users
    if (blockedIds.length > 0) {
      query = query.not('author_id', 'in', `(${blockedIds.join(',')})`);
    }

    if (sort === 'popular') {
      query = query.order('like_count', { ascending: false }).order('created_at', { ascending: false });
    } else if (sort === 'smart') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Over-fetch for ranked sorts to re-rank in JS
    const needsRanking = sort === 'smart' || sort === 'popular';
    const fetchLimit = needsRanking ? 50 : limit;
    let { data: comments, error } = await query.range(needsRanking ? 0 : offset, needsRanking ? fetchLimit : offset + limit);

    if (error) return safeError(error);

    // Ranked scoring for smart and popular tabs
    if (needsRanking && comments && comments.length > 0) {
      const now = Date.now();

      // Self-like batch query: check which authors liked their own comment
      const selfLikeSet = new Set<number>();
      const commentAuthorPairs = comments.map((c: any) => ({ id: c.id, authorId: c.author_id })).filter((p: any) => p.authorId);
      if (commentAuthorPairs.length > 0) {
        const commentIds = commentAuthorPairs.map((p: any) => p.id);
        const authorIds = [...new Set(commentAuthorPairs.map((p: any) => p.authorId))];
        const { data: selfLikes } = await admin
          .from('comment_likes')
          .select('comment_id, user_id')
          .in('comment_id', commentIds)
          .in('user_id', authorIds);
        if (selfLikes) {
          const authorMap = new Map(commentAuthorPairs.map((p: any) => [p.id, p.authorId]));
          for (const sl of selfLikes) {
            if (authorMap.get(sl.comment_id) === sl.user_id) {
              selfLikeSet.add(sl.comment_id);
            }
          }
        }
      }

      const scoreFn = sort === 'popular' ? scorePopular : scoreSmart;

      const scored = comments.map((c: any) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        const ageHours = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
        const input: ScoringInput = {
          likeCount: c.like_count || 0,
          replyCount: c.reply_count || 0,
          profileScore: profile?.profile_score ?? 50,
          spamScore: profile?.spam_score ?? 0,
          isVerified: !!profile?.is_verified,
          isPremium: !!profile?.premium_plan,
          contentLength: c.content_type === 'gif' ? 0 : wordCount(c.content),
          isGif: c.content_type === 'gif',
          ageHours,
          hasSelfLike: selfLikeSet.has(c.id),
        };
        return { ...c, _score: scoreFn(input) };
      });

      scored.sort((a: any, b: any) => b._score - a._score);
      comments = scored.slice(offset, offset + limit).map(({ _score, ...rest }: any) => rest);
    }

    // Filter out inactive authors and NSFW comments (staff sees all)
    const activeComments = (comments || []).filter((c: any) => {
      if (isStaffViewer) return true;
      const authorProfile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      if (authorProfile?.status && authorProfile.status !== 'active') return false;
      // NSFW comments: only visible to the comment author
      if (c.is_nsfw && c.author_id !== user?.id) return false;
      return true;
    });

    // Batch-load all replies in a single query (fixes N+1)
    const commentIdsWithReplies = activeComments.filter((c: any) => c.reply_count > 0).map((c: any) => c.id);
    const replyMap = new Map<number, any[]>();

    if (commentIdsWithReplies.length > 0) {
      let replyQuery = admin
        .from('comments')
        .select(`id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw, profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status, profile_score, spam_score)`)
        .in('parent_id', commentIdsWithReplies)
        .eq('status', 'approved')
        .order('created_at', { ascending: true });

      if (blockedIds.length > 0) {
        replyQuery = replyQuery.not('author_id', 'in', `(${blockedIds.join(',')})`);
      }

      const { data: allReplies } = await replyQuery;
      for (const r of (allReplies || [])) {
        const rAuthor = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        if (!isStaffViewer) {
          if (rAuthor?.status && rAuthor.status !== 'active') continue;
          // NSFW replies: only visible to the reply author
          if ((r as any).is_nsfw && r.author_id !== user?.id) continue;
        }
        const parentId = r.parent_id as number;
        if (!replyMap.has(parentId)) replyMap.set(parentId, []);
        const bucket = replyMap.get(parentId)!;
        if (bucket.length < 10) {
          bucket.push({ ...r, profiles: rAuthor });
        }
      }
    }

    const stripScores = (profile: any) => {
      if (!profile) return profile;
      const { profile_score, spam_score, ...rest } = profile;
      return rest;
    };

    const result = activeComments.map((c: any) => ({
      ...c,
      profiles: stripScores(Array.isArray(c.profiles) ? c.profiles[0] : c.profiles),
      replies: (replyMap.get(c.id) || []).map((r: any) => ({
        ...r,
        profiles: stripScores(r.profiles),
      })),
    }));

    // Include user's liked comment IDs so client can show liked state
    let userLikedIds: number[] = [];
    if (user) {
      const commentIds = result.map((c: any) => c.id);
      const replyIds = result.flatMap((c: any) => (c.replies || []).map((r: any) => r.id));
      const allIds = [...commentIds, ...replyIds];
      if (allIds.length > 0) {
        const { data: likes } = await admin
          .from('comment_likes')
          .select('comment_id')
          .eq('user_id', user.id)
          .in('comment_id', allIds);
        userLikedIds = (likes || []).map((l: any) => l.comment_id);
      }
    }

    // Deep-link: if target comment is a reply, ensure its parent is in results
    const targetParam = request.nextUrl.searchParams.get('target');
    let targetParentId: number | null = null;

    if (targetParam) {
      const targetId = parseInt(targetParam);
      if (!isNaN(targetId)) {
        // Check if target is a top-level comment already in results
        const isTopLevel = result.some((c: any) => c.id === targetId);
        if (!isTopLevel) {
          // Check if it's already in a loaded reply
          const parentWithReply = result.find((c: any) => c.replies?.some((r: any) => r.id === targetId));
          if (parentWithReply) {
            targetParentId = parentWithReply.id;
          } else {
            // Fetch the target comment to check if it's a reply
            const { data: targetComment } = await admin
              .from('comments')
              .select(`id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw, profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status)`)
              .eq('id', targetId)
              .eq('status', 'approved')
              .single();

            if (targetComment?.parent_id) {
              targetParentId = targetComment.parent_id;
              const targetProfile = Array.isArray(targetComment.profiles) ? targetComment.profiles[0] : targetComment.profiles;
              const cleanTarget = { ...targetComment, profiles: targetProfile };

              // Check if parent is already in results
              const parentIdx = result.findIndex((c: any) => c.id === targetParentId);
              if (parentIdx >= 0) {
                // Parent exists, add target reply if not already there
                if (!result[parentIdx].replies.some((r: any) => r.id === targetId)) {
                  result[parentIdx].replies.push(cleanTarget);
                }
              } else {
                // Fetch parent comment and prepend to results
                const { data: parentComment } = await admin
                  .from('comments')
                  .select(`id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw, profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status)`)
                  .eq('id', targetParentId)
                  .eq('status', 'approved')
                  .single();

                if (parentComment) {
                  const parentProfile = Array.isArray(parentComment.profiles) ? parentComment.profiles[0] : parentComment.profiles;
                  result.unshift({
                    ...parentComment,
                    profiles: parentProfile,
                    replies: [cleanTarget],
                  });
                }
              }
            }
          }
        }
      }
    }

    const response = NextResponse.json({
      comments: result,
      hasMore: (comments || []).length > limit,
      userLikedIds,
      ...(targetParentId && { targetParentId }),
    });
    if (user) {
      response.headers.set('Cache-Control', 'private, no-store');
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    }
    return response;
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const postId = parseInt(id);
    if (isNaN(postId)) return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();

    // Access restriction check
    const { data: myProfile } = await admin
      .from('profiles')
      .select('restricted_comment')
      .eq('user_id', user.id)
      .single();
    if (myProfile?.restricted_comment) {
      return NextResponse.json({ error: 'Yorum özelliğiniz kısıtlanmıştır' }, { status: 403 });
    }

    const { content, parent_id, content_type, gif_url } = await request.json();
    const isGif = content_type === 'gif';

    // Plan bazli yorum karakter limiti (max/business: 500, digerleri: 250)
    const plan = await getUserPlan(admin, user.id);
    const maxCommentLength = COMMENT_CHAR_LIMITS[plan];

    if (isGif) {
      if (!gif_url || typeof gif_url !== 'string' || !isValidGifUrl(gif_url)) {
        return NextResponse.json({ error: 'Geçersiz GIF URL' }, { status: 400 });
      }
    } else {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Yorum içeriği gerekli' }, { status: 400 });
      }
      if (content.trim().length > maxCommentLength) {
        return NextResponse.json({ error: `Yorum en fazla ${maxCommentLength} karakter` }, { status: 400 });
      }
      // Spam keyword detection
      const spamPatterns = /eval\s*\(|base64_decode|exec\s*\(|system\s*\(|shell_exec|passthru|<script|<iframe|<object|<embed|javascript:/i;
      if (spamPatterns.test(content)) {
        return NextResponse.json({ error: 'Yorum spam olarak algılandı' }, { status: 400 });
      }
      // Link count limit (max 2 links)
      const linkCount = (content.match(/https?:\/\//gi) || []).length;
      if (linkCount > 2) {
        return NextResponse.json({ error: 'Yorumda en fazla 2 link olabilir' }, { status: 400 });
      }
    }

    // Check if user is blocked by post author or vice versa
    const { data: postCheck } = await admin
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();
    if (postCheck) {
      const { data: blockCheck } = await admin
        .from('blocks')
        .select('id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${postCheck.author_id}),and(blocker_id.eq.${postCheck.author_id},blocked_id.eq.${user.id})`)
        .limit(1);
      if (blockCheck && blockCheck.length > 0) {
        return NextResponse.json({ error: 'Bu gönderiye yorum yapamazsınız' }, { status: 403 });
      }
    }

    // Rate limiting: max 5 comments per minute
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCount } = await admin
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', user.id)
      .gte('created_at', oneMinuteAgo);
    if (recentCount && recentCount >= 5) {
      return NextResponse.json({ error: 'Topluluğumuzu korumak adına yorum hızınız sınırlandırıldı, lütfen biraz bekleyin' }, { status: 429 });
    }

    // Daily comment limit check (plan zaten yukarida alinmisti)
    const { allowed, limit } = await checkDailyLimit(admin, user.id, 'comment', plan);
    if (!allowed) {
      logRateLimitHit(admin, user.id, 'comment', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim());
      return NextResponse.json(
        { error: `Topluluğumuzu korumak adına günlük yorum limitine ulaştın (${limit}). Premium ile artır.`, limit, remaining: 0 },
        { status: 429 }
      );
    }

    // Duplicate comment prevention (60 seconds)
    const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
    const dupeQuery = admin
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('author_id', user.id)
      .gte('created_at', sixtySecondsAgo);

    if (isGif) {
      dupeQuery.eq('content_type', 'gif').eq('gif_url', gif_url);
    } else {
      dupeQuery.eq('content', content.trim());
    }

    const { count: dupeCount } = await dupeQuery;
    if (dupeCount && dupeCount > 0) {
      return NextResponse.json({ error: 'Topluluğumuzu korumak adına aynı yorumu tekrar gönderemezsiniz' }, { status: 429 });
    }

    // Admin bypass for AI moderation
    const { data: commenterProfile } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
    const isAdminUser = commenterProfile?.role === 'admin';

    // Immediate AI moderation for text comments (synchronous) — admin immune
    let initialNSFW = false;
    let commentModReason: string | null = null;
    let commentModCategory: string | null = null;
    if (!isGif && content && !isAdminUser) {
      try {
        // Fetch author profile signals
        let profileMeta: { profileScore?: number; spamScore?: number } = {};
        try { const { getProfileSignals } = await import('@/lib/modSignals'); profileMeta = await getProfileSignals(user.id); } catch {}
        const linkCount = (content.match(/https?:\/\//g) || []).length;
        const mod = await checkTextContent('', content, { contentType: 'comment', linkCount, ...profileMeta });
        if (mod.safe === false) {
          initialNSFW = true;
          commentModReason = mod.reason || null;
          commentModCategory = mod.category || null;
        }
      } catch {}
    }

    const { data: comment, error } = await admin
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: isGif ? (content?.trim() || '') : content.trim(),
        content_type: isGif ? 'gif' : 'text',
        gif_url: isGif ? gif_url : null,
        parent_id: parent_id || null,
        status: 'approved',
        is_nsfw: initialNSFW,
        moderation_reason: commentModReason,
        moderation_category: commentModCategory,
      })
      .select(`id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw, profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role)`)
      .single();

    if (error) return safeError(error);

    // Recalculate post comment_count to ensure accuracy (exclude NSFW)
    try {
      const { count } = await admin
        .from('comments')
        .select('id', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('status', 'approved')
        .eq('is_nsfw', false);
      await admin.from('posts').update({ comment_count: count || 0 }).eq('id', postId);
    } catch {}

    // Notify author if comment is under moderation + AI decision record
    if (initialNSFW) {
      try {
        const aiComCode = String(Math.floor(100000 + Math.random() * 900000));
        await admin.from('moderation_decisions').insert({
          target_type: 'comment', target_id: String(comment.id), decision: 'flagged', reason: commentModReason || 'Feedim AI tarafından işaretlendi', moderator_id: 'system', decision_code: aiComCode,
        });
      } catch {}
      try {
        const raw = (content || "").replace(/\s+/g, " ").trim();
        const snippet = raw.slice(0, 20);
        const shortText = raw.length > 20 ? `${snippet}...` : snippet;
        await createNotification({
          admin,
          user_id: user.id,
          actor_id: user.id,
          type: 'moderation_review',
          object_type: 'comment',
          object_id: comment.id,
          content: `"${shortText}" yorumunuz inceleniyor. Detaylar için tıklayın.`,
        });
      } catch {}
    }

    // Create notification for post author (comment) or parent comment author (reply)
    const notifContent = isGif ? 'GIF gönderdi' : (content || '').trim().slice(0, 80);
    if (parent_id) {
      const { data: parentComment } = await admin
        .from('comments')
        .select('author_id')
        .eq('id', parent_id)
        .single();
      if (parentComment) {
        await createNotification({ admin, user_id: parentComment.author_id, actor_id: user.id, type: 'reply', object_type: 'comment', object_id: postId, content: notifContent });
      }
    } else {
      const { data: post } = await admin
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      if (post) {
        await createNotification({ admin, user_id: post.user_id, actor_id: user.id, type: 'comment', object_type: 'post', object_id: postId, content: notifContent });
      }
    }

    // Create mention notifications (only for followers/following)
    const mentionMatches = (content || '').trim().match(/@([A-Za-z0-9._-]+)/g);
    if (mentionMatches) {
      const mentionedUsernames = [...new Set(mentionMatches.map((m: string) => m.slice(1).toLowerCase()))];
      for (const mentionedUsername of mentionedUsernames.slice(0, 3)) {
        const { data: mentionedUser } = await admin
          .from('profiles')
          .select('user_id')
          .eq('username', mentionedUsername)
          .single();
        if (mentionedUser && mentionedUser.user_id !== user.id) {
          // Verify follow relationship (either direction)
          const { count } = await admin
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .or(
              `and(follower_id.eq.${user.id},following_id.eq.${mentionedUser.user_id}),and(follower_id.eq.${mentionedUser.user_id},following_id.eq.${user.id})`
            );
          if (count && count > 0) {
            await createNotification({ admin, user_id: mentionedUser.user_id, actor_id: user.id, type: 'mention', object_type: 'comment', object_id: postId, content: (content || '').trim().slice(0, 80) });
          }
        }
      }
    }

    // Not: AI kontrolü artık senkron yapıldı; arka plan güncellemesine gerek yok.

    return NextResponse.json({
      comment: {
        ...comment,
        profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
        replies: [],
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
