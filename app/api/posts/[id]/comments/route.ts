import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getUserPlan, checkDailyLimit, logRateLimitHit, COMMENT_CHAR_LIMITS } from '@/lib/limits';
import { checkTextContent } from '@/lib/moderation';
import { safePage } from '@/lib/utils';

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

    let query = admin
      .from('comments')
      .select(`
        id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw,
        profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status)
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
      // Smart sort: mix of engagement + recency
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // For smart sort, fetch more to re-rank
    const fetchLimit = sort === 'smart' ? Math.max(limit * 3, 30) : limit;
    let { data: comments, error } = await query.range(sort === 'smart' ? 0 : offset, sort === 'smart' ? fetchLimit : offset + limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Smart scoring: balance likes, replies, and recency
    if (sort === 'smart' && comments && comments.length > 0) {
      const now = Date.now();
      const scored = comments.map((c: any) => {
        const ageHours = (now - new Date(c.created_at).getTime()) / (1000 * 60 * 60);
        const recency = Math.max(0, 100 - ageHours * 2);
        const engagement = (c.like_count || 0) * 10 + (c.reply_count || 0) * 15;
        return { ...c, _smart: recency + engagement };
      });
      scored.sort((a: any, b: any) => b._smart - a._smart);
      comments = scored.slice(offset, offset + limit).map(({ _smart, ...rest }: any) => rest);
    }

    // Check if viewer is staff (admin/moderator)
    let isStaffViewer = false;
    if (user) {
      const { data: viewerP } = await admin.from('profiles').select('role').eq('user_id', user.id).single();
      isStaffViewer = viewerP?.role === 'admin' || viewerP?.role === 'moderator';
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
        .select(`id, content, content_type, gif_url, author_id, parent_id, like_count, reply_count, created_at, is_nsfw, profiles!comments_author_id_fkey(username, full_name, name, avatar_url, is_verified, premium_plan, role, status)`)
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
        if (bucket.length < 5) {
          bucket.push({ ...r, profiles: rAuthor });
        }
      }
    }

    const result = activeComments.map((c: any) => ({
      ...c,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      replies: replyMap.get(c.id) || [],
    }));

    const response = NextResponse.json({ comments: result, hasMore: (comments || []).length > limit });
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
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
      if (!gif_url || typeof gif_url !== 'string' || !(gif_url.includes('tenor.com') || gif_url.includes('giphy.com'))) {
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
      return NextResponse.json({ error: 'Çok hızlı yorum yapıyorsunuz, biraz bekleyin' }, { status: 429 });
    }

    // Daily comment limit check (plan zaten yukarida alinmisti)
    const { allowed, limit } = await checkDailyLimit(admin, user.id, 'comment', plan);
    if (!allowed) {
      logRateLimitHit(admin, user.id, 'comment', request.headers.get('x-forwarded-for')?.split(',')[0]?.trim());
      return NextResponse.json(
        { error: `Günlük yorum limitine ulaştın (${limit}). Premium ile artır.`, limit, remaining: 0 },
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
      return NextResponse.json({ error: 'Aynı yorumu tekrar gönderemezsiniz' }, { status: 429 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

    // Create mention notifications
    const mentionMatches = (content || '').trim().match(/@([A-Za-z0-9._-]+)/g);
    if (mentionMatches) {
      const mentionedUsernames = [...new Set(mentionMatches.map((m: string) => m.slice(1).toLowerCase()))];
      for (const mentionedUsername of mentionedUsernames.slice(0, 3)) {
        const { data: mentionedUser } = await admin
          .from('profiles')
          .select('user_id')
          .eq('username', mentionedUsername)
          .single();
        if (mentionedUser) {
          await createNotification({ admin, user_id: mentionedUser.user_id, actor_id: user.id, type: 'mention', object_type: 'comment', object_id: postId, content: (content || '').trim().slice(0, 80) });
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
