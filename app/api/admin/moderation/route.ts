import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { sendEmail, getEmailIfEnabled, moderationApprovedEmail, moderationRejectedEmail } from '@/lib/email';

async function verifyAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return profile?.role === 'admin' || profile?.role === 'moderator';
}

// Generate a 6-digit unique decision code. Tries decision_code column; falls back to embedding in reason.
async function generateDecisionCode(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const maxAttempts = 5;
  for (let i = 0; i < maxAttempts; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    // Try to check uniqueness on decision_code column if exists
    try {
      const { count, error } = await admin
        .from('moderation_decisions')
        .select('id', { count: 'exact', head: true })
        .eq('decision_code', code);
      if (!error && (!count || count === 0)) return code;
    } catch (_) {
      // Column may not exist; fall back to reason text search
      const { count } = await admin
        .from('moderation_decisions')
        .select('id', { count: 'exact', head: true })
        .ilike('reason', `%#${code}%`);
      if (!count || count === 0) return code;
    }
  }
  // As a last resort, return a time-based code slice
  return String(Date.now()).slice(-6);
}

// GET: Moderation queue — reported content, flagged posts, spam users
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await verifyAdmin(admin, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tab = request.nextUrl.searchParams.get('tab') || 'reports';
    const rawPage = Number(request.nextUrl.searchParams.get('page') || '1');
    const page = Math.max(1, Math.min(isNaN(rawPage) ? 1 : rawPage, 500));
    const limit = 10;
    const offset = (page - 1) * limit;

    if (tab === 'reports') {
      const { data: reports, count } = await admin
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(username, full_name, avatar_url),
          content_author:profiles!reports_content_author_id_fkey(username, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      {
        const resp = NextResponse.json({ reports: reports || [], total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'flagged_posts') {
      const { data: posts, count } = await admin
        .from('posts')
        .select(`
          id, title, slug, content_type, status, is_nsfw, moderation_due_at, moderation_reason, moderation_category, spam_score, quality_score, created_at, copyright_match_id, copyright_similarity,
          author:profiles!posts_author_id_fkey(user_id, username, full_name, avatar_url)
        `, { count: 'exact' })
        .or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)')
        .order('moderation_due_at', { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);

      // Enrich copyright matches with original post info
      const postsArr = posts || [];
      const copyrightPostIds = postsArr
        .filter(p => p.copyright_match_id)
        .map(p => p.copyright_match_id);

      let copyrightMap = new Map<number, { slug: string; author_username: string }>();
      if (copyrightPostIds.length > 0) {
        const { data: originals } = await admin
          .from('posts')
          .select('id, slug, author:profiles!posts_author_id_fkey(username)')
          .in('id', copyrightPostIds);
        for (const o of originals || []) {
          const author = Array.isArray(o.author) ? o.author[0] : o.author;
          copyrightMap.set(o.id, {
            slug: o.slug,
            author_username: author?.username || '?',
          });
        }
      }

      // Read stored moderation_reason — no on-the-fly AI scanning
      const withReasons = postsArr.map(p => ({
        ...p,
        ai_reason: p.moderation_reason || 'İnceleme gerekiyor',
        copyright_match: p.copyright_match_id ? copyrightMap.get(p.copyright_match_id) || null : null,
      }));

      {
        const resp = NextResponse.json({ posts: withReasons, total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    // spam_users tab removed

    if (tab === 'moderation_users') {
      const { data: users, count } = await admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, status, role, moderation_reason, created_at, updated_at', { count: 'exact' })
        .in('status', ['moderation', 'blocked', 'deleted'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      {
        const resp = NextResponse.json({ users: users || [], total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'withdrawals') {
      const { data: withdrawals, count } = await admin
        .from('withdrawal_requests')
        .select(`
          *,
          user:profiles!withdrawal_requests_user_id_fkey(username, full_name, avatar_url, coin_balance, total_earned)
        `, { count: 'exact' })
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      {
        const resp = NextResponse.json({ withdrawals: withdrawals || [], total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'recent_users') {
      const rawQ = (request.nextUrl.searchParams.get('q') || '').trim();
      const q = rawQ.length >= 2 ? rawQ.slice(0, 50) : '';
      const maxPage = 5; // cap to 50 items total
      const safePage = q ? 1 : Math.min(page, maxPage);
      const searchLimit = 10;
      const searchOffset = q ? 0 : (safePage - 1) * searchLimit;
      let usersQuery = admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, status, role, is_verified, is_premium, premium_plan, spam_score, shadow_banned, post_count, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(searchOffset, searchOffset + searchLimit - 1);
      if (q) {
        usersQuery = usersQuery.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
      }
      const { data: users, count } = await usersQuery;

      {
        const resp = NextResponse.json({ users: users || [], total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'flagged_comments') {
      const { data: comments, count } = await admin
        .from('comments')
        .select(`
          id, content, content_type, gif_url, is_nsfw, status, post_id, author_id, created_at, moderation_reason, moderation_category,
          author:profiles!comments_author_id_fkey(user_id, username, full_name, avatar_url),
          post:posts!comments_post_id_fkey(slug)
        `, { count: 'exact' })
        .eq('is_nsfw', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Flatten post slug
      const withSlug = (comments || []).map(c => {
        const post = Array.isArray(c.post) ? c.post[0] : c.post;
        return { ...c, post_slug: post?.slug || null };
      });

      {
        const resp = NextResponse.json({ comments: withSlug, total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'recent_posts') {
      const rawQ = (request.nextUrl.searchParams.get('q') || '').trim();
      const q = rawQ.length >= 2 ? rawQ.slice(0, 50) : '';
      const maxPage = 5; // cap to 50 items total
      const safePage = q ? 1 : Math.min(page, maxPage);
      const searchLimit = 10;
      const searchOffset = q ? 0 : (safePage - 1) * searchLimit;
      let postsQuery = admin
        .from('posts')
        .select(`
          id, title, slug, status, content_type, spam_score, view_count, like_count, comment_count, created_at,
          author:profiles!posts_author_id_fkey(username, full_name, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(searchOffset, searchOffset + searchLimit - 1);
      if (q) {
        postsQuery = postsQuery.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
      }
      const { data: posts, count } = await postsQuery;

      {
        const resp = NextResponse.json({ posts: posts || [], total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'copyright_claims') {
      const { data: claims, count } = await admin
        .from('copyright_claims')
        .select(`
          *,
          post:posts!copyright_claims_post_id_fkey(id, title, slug, content_type, status),
          claimant:profiles!copyright_claims_claimant_id_fkey(username, full_name, avatar_url),
          matched_post:posts!copyright_claims_matched_post_id_fkey(id, title, slug),
          matched_author:profiles!copyright_claims_matched_author_id_fkey(username, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      // Enrich with verification info for matched posts
      const claimsArr = claims || [];
      const matchedPostIds = claimsArr.filter(c => c.matched_post_id).map(c => c.matched_post_id);
      let verificationMap = new Map<number, { owner_name: string; company_name?: string | null }>();
      if (matchedPostIds.length > 0) {
        const { data: verifications } = await admin
          .from('copyright_verifications')
          .select('post_id, owner_name, company_name')
          .in('post_id', matchedPostIds);
        for (const v of verifications || []) {
          verificationMap.set(v.post_id, { owner_name: v.owner_name, company_name: v.company_name });
        }
      }

      const withVerification = claimsArr.map(c => ({
        ...c,
        matched_verification: c.matched_post_id ? verificationMap.get(c.matched_post_id) || null : null,
      }));

      {
        const resp = NextResponse.json({ claims: withVerification, total: count || 0, page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'overview') {
      const [
        { count: pendingReports },
        { count: flaggedPosts },
        // spamUsers removed
        { count: modUsers },
        { count: pendingWithdrawals },
        { count: pendingCopyrightClaims },
        { data: recentActions },
      ] = await Promise.all([
        admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('posts').select('id', { count: 'exact', head: true }).or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)'),
        // spamUsers removed
        admin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'moderation'),
        admin.from('withdrawal_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
        admin.from('copyright_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('moderation_logs')
          .select('*, moderator:profiles!moderation_logs_moderator_id_fkey(username, full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      return NextResponse.json({
        pendingReports: pendingReports || 0,
        flaggedPosts: flaggedPosts || 0,
        // spamUsers removed
        moderationUsers: modUsers || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingCopyrightClaims: pendingCopyrightClaims || 0,
        recentActions: recentActions || [],
      });
    }

    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST: Take moderation action
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await verifyAdmin(admin, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, target_type, target_id, reason } = body;

    if (!action || !target_type || !target_id) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
    }

    // Admin-only actions — moderators cannot perform these
    const adminOnlyActions = ['grant_premium', 'revoke_premium', 'delete_user', 'unverify_user'];
    if (adminOnlyActions.includes(action)) {
      const { data: modProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (modProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Bu işlem yalnızca yöneticilere özeldir' }, { status: 403 });
      }
    }

    // Admin accounts and their content cannot be moderated
    const restrictedUserActions = ['ban_user', 'freeze_user', 'delete_user', 'warn_user', 'moderation_user'];
    if (target_type === 'user' && restrictedUserActions.includes(action)) {
      const { data: targetProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('user_id', target_id)
        .single();
      if (targetProfile?.role === 'admin') {
        return NextResponse.json({ error: 'Admin hesaplarına bu işlem uygulanamaz' }, { status: 403 });
      }
    }
    // Protect admin posts from removal/moderation
    const restrictedPostActions = ['remove_post', 'archive_post'];
    if (target_type === 'post' && restrictedPostActions.includes(action)) {
      const { data: postData } = await admin.from('posts').select('author_id').eq('id', Number(target_id)).single();
      if (postData) {
        const { data: authorP } = await admin.from('profiles').select('role').eq('user_id', postData.author_id).single();
        if (authorP?.role === 'admin') {
          return NextResponse.json({ error: 'Admin içerikleri kaldırılamaz' }, { status: 403 });
        }
      }
    }
    // Protect admin comments from removal
    if (target_type === 'comment' && action === 'remove_comment') {
      const { data: comData } = await admin.from('comments').select('author_id').eq('id', Number(target_id)).single();
      if (comData?.author_id) {
        const { data: authorP } = await admin.from('profiles').select('role').eq('user_id', comData.author_id).single();
        if (authorP?.role === 'admin') {
          return NextResponse.json({ error: 'Admin içerikleri kaldırılamaz' }, { status: 403 });
        }
      }
    }

    // Log the action
    await admin.from('moderation_logs').insert({
      moderator_id: user.id,
      action,
      target_type,
      target_id: String(target_id),
      reason: reason || null,
    });

    // Helper: resolve duplicate moderation items for same author + content_hash
    async function resolveDuplicatePosts(postId: number, decision: 'approve' | 'reject' | 'dismiss', rejectReason?: string) {
      try {
        const { data: srcPost } = await admin.from('posts')
          .select('author_id, content_hash')
          .eq('id', postId)
          .single();
        if (!srcPost?.content_hash) return;

        // Find other posts from same author with same content_hash in moderation
        const { data: dupes } = await admin.from('posts')
          .select('id')
          .eq('author_id', srcPost.author_id)
          .eq('content_hash', srcPost.content_hash)
          .neq('id', postId)
          .or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)');

        if (!dupes || dupes.length === 0) return;

        for (const dupe of dupes) {
          if (decision === 'approve') {
            await admin.from('posts').update({ is_nsfw: false, moderation_due_at: null }).eq('id', dupe.id);
          } else if (decision === 'reject') {
            await admin.from('posts').update({ status: 'removed', is_nsfw: false, removed_at: new Date().toISOString(), removal_reason: rejectReason || null }).eq('id', dupe.id);
          } else {
            await admin.from('posts').update({ status: 'removed', is_nsfw: false, removed_at: new Date().toISOString(), removal_reason: 'Moderasyondan silindi' }).eq('id', dupe.id);
          }
          try { await admin.from('reports').delete().eq('content_type', 'post').eq('content_id', dupe.id); } catch {}
        }
      } catch {}
    }

    // Helper: resolve duplicate moderation comments from same author + content
    async function resolveDuplicateComments(commentId: number, decision: 'approve' | 'reject' | 'dismiss') {
      try {
        const { data: srcComment } = await admin.from('comments')
          .select('author_id, content')
          .eq('id', commentId)
          .single();
        if (!srcComment?.content) return;

        const { data: dupes } = await admin.from('comments')
          .select('id, post_id')
          .eq('author_id', srcComment.author_id)
          .eq('content', srcComment.content)
          .eq('is_nsfw', true)
          .eq('status', 'approved')
          .neq('id', commentId);

        if (!dupes || dupes.length === 0) return;

        for (const dupe of dupes) {
          if (decision === 'approve') {
            await admin.from('comments').update({ is_nsfw: false }).eq('id', dupe.id);
          } else {
            await admin.from('comments').delete().eq('id', dupe.id);
          }
          if (dupe.post_id) {
            const { count } = await admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', dupe.post_id).eq('status', 'approved').eq('is_nsfw', false);
            await admin.from('posts').update({ comment_count: count || 0 }).eq('id', dupe.post_id);
          }
        }
      } catch {}
    }

    switch (action) {
      case 'approve_content': {
        // Create moderation decision record with decision code
        const approveCode = await generateDecisionCode(admin);
        const { data: approveDecision } = await admin.from('moderation_decisions')
          .insert({ target_type, target_id: String(target_id), decision: 'approved', reason: reason || 'İçerik onaylandı', moderator_id: user.id, decision_code: approveCode })
          .select('id').single();

        if (target_type === 'post') {
          const { data: approvedPost } = await admin.from('posts')
            .update({ status: 'published', is_nsfw: false, moderation_due_at: null, moderation_reason: null, moderation_category: null })
            .eq('id', Number(target_id))
            .select('author_id, title, slug').single();

          if (approvedPost) {
            // Notification
            await createNotification({
              admin, user_id: approvedPost.author_id, actor_id: approvedPost.author_id,
              type: 'moderation_approved', object_type: 'post', object_id: Number(target_id),
              content: 'Gönderiniz onaylandı ve herkese açıldı.',
            });
            // Notify all reporters: no violation found
            try {
              const { data: reporters } = await admin
                .from('reports')
                .select('reporter_id')
                .eq('content_type', 'post')
                .eq('content_id', Number(target_id));
              for (const rep of reporters || []) {
                await createNotification({ admin, user_id: rep.reporter_id, actor_id: user.id, type: 'system', object_type: 'post', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerikte ihlal bulunmadı.' });
              }
              await admin.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(target_id));
            } catch {}
            // Email
            const email = await getEmailIfEnabled(approvedPost.author_id, 'moderation_approved');
            if (email) {
              const tpl = moderationApprovedEmail(approvedPost.title, approvedPost.slug);
              await sendEmail({ to: email, ...tpl, template: 'moderation_approved', userId: approvedPost.author_id });
            }
          }
        } else if (target_type === 'comment') {
          const { data: approvedComment } = await admin.from('comments')
            .update({ is_nsfw: false })
            .eq('id', Number(target_id))
            .select('author_id, post_id')
            .single();
          // Recalculate comment count
          if (approvedComment?.post_id) {
            const { count } = await admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', approvedComment.post_id).eq('status', 'approved').eq('is_nsfw', false);
            await admin.from('posts').update({ comment_count: count || 0 }).eq('id', approvedComment.post_id);
          }
          // Notify comment author
          if (approvedComment?.author_id) {
            await createNotification({
              admin, user_id: approvedComment.author_id, actor_id: approvedComment.author_id,
              type: 'moderation_approved', object_type: 'comment', object_id: Number(target_id),
              content: 'Yorumunuz onaylandı ve herkese açıldı.',
            });
          }
          try {
            const { data: reps } = await admin
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await createNotification({ admin, user_id: rep.reporter_id, actor_id: user.id, type: 'system', object_type: 'comment', object_id: Number(target_id), content: 'Şikayet edilen içerikte ihlal bulunmadı.' });
            }
            await admin.from('reports').delete().eq('content_type', 'comment').eq('content_id', Number(target_id));
          } catch {}
          // Resolve duplicate comments
          await resolveDuplicateComments(Number(target_id), 'approve');
        }
        // Resolve duplicate posts
        if (target_type === 'post') await resolveDuplicatePosts(Number(target_id), 'approve');
        break;
      }

      case 'reject_content': {
        // Create moderation decision record with unique 6-digit code
        const decisionCode = await generateDecisionCode(admin);
        let rejectDecision: any = null;
        try {
          const ins = await admin.from('moderation_decisions')
            .insert({ target_type, target_id: String(target_id), decision: 'removed', reason: reason || null, moderator_id: user.id, decision_code: decisionCode })
            .select('id, decision_code').single();
          rejectDecision = ins.data;
        } catch (_) {
          // Fallback if decision_code column is missing: append Ref to reason
          const reasonWithRef = reason ? `${reason} (Ref:#${decisionCode})` : `Ref:#${decisionCode}`;
          const ins2 = await admin.from('moderation_decisions')
            .insert({ target_type, target_id: String(target_id), decision: 'removed', reason: reasonWithRef, moderator_id: user.id })
            .select('id').single();
          rejectDecision = ins2.data;
        }

        if (target_type === 'post') {
          const { data: rejectedPost } = await admin.from('posts')
            .update({
              status: 'removed',
              is_nsfw: false,
              removed_at: new Date().toISOString(),
              removal_reason: reason || null,
              removal_decision_id: rejectDecision?.id || null,
            })
            .eq('id', Number(target_id))
            .select('author_id, title, slug').single();

          if (rejectedPost) {
            // Notification
            await createNotification({
              admin, user_id: rejectedPost.author_id, actor_id: rejectedPost.author_id,
              type: 'moderation_rejected', object_type: 'post', object_id: Number(target_id),
              content: `Gönderiniz kaldırıldı. Karar No: #${decisionCode}. Sebep: ${reason || 'Belirtilmedi'}`,
            });
            // Notify all reporters: removed
            try {
              const { data: reporters } = await admin
                .from('reports')
                .select('reporter_id')
                .eq('content_type', 'post')
                .eq('content_id', Number(target_id));
              for (const rep of reporters || []) {
                await createNotification({ admin, user_id: rep.reporter_id, actor_id: user.id, type: 'system', object_type: 'post', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerik moderasyonca kaldırıldı.' });
              }
            } catch {}
            // Email
            const email = await getEmailIfEnabled(rejectedPost.author_id, 'moderation_rejected');
            if (email) {
              const tpl = moderationRejectedEmail(rejectedPost.title, reason || '', decisionCode);
              await sendEmail({ to: email, ...tpl, template: 'moderation_rejected', userId: rejectedPost.author_id });
            }
          }
        } else if (target_type === 'comment') {
          const { data: rejectedComment } = await admin.from('comments')
            .update({ status: 'rejected', is_nsfw: false, moderation_reason: reason || null })
            .eq('id', Number(target_id))
            .select('author_id, post_id')
            .single();
          // Recalculate comment count
          if (rejectedComment?.post_id) {
            const { count } = await admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', rejectedComment.post_id).eq('status', 'approved').eq('is_nsfw', false);
            await admin.from('posts').update({ comment_count: count || 0 }).eq('id', rejectedComment.post_id);
          }
          // Notify comment author about removal
          if (rejectedComment?.author_id) {
            await createNotification({
              admin, user_id: rejectedComment.author_id, actor_id: rejectedComment.author_id,
              type: 'moderation_rejected', object_type: 'comment', object_id: Number(target_id),
              content: `Yorumunuz kaldırıldı. Karar No: #${decisionCode}. Sebep: ${reason || 'Belirtilmedi'}`,
            });
          }
          try {
            const { data: reps } = await admin
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await createNotification({ admin, user_id: rep.reporter_id, actor_id: user.id, type: 'system', object_type: 'comment', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerik moderasyonca kaldırıldı.' });
            }
            await admin.from('reports').delete().eq('content_type', 'comment').eq('content_id', Number(target_id));
          } catch {}
          // Resolve duplicate comments
          await resolveDuplicateComments(Number(target_id), 'reject');
        }
        // Resolve duplicate posts
        if (target_type === 'post') await resolveDuplicatePosts(Number(target_id), 'reject', reason);
        break;
      }

      case 'approve_post': {
        const appPostCode = await generateDecisionCode(admin);
        await admin.from('posts').update({ status: 'published' }).eq('id', Number(target_id));
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'post', target_id: String(target_id), decision: 'approved', reason: reason || 'Gönderi onaylandı', moderator_id: user.id, decision_code: appPostCode,
          });
        } catch {}
        break;
      }

      case 'remove_post': {
        const rmPostCode = await generateDecisionCode(admin);
        await admin.from('posts').update({ status: 'removed', removed_at: new Date().toISOString(), removal_reason: reason || 'Gönderi kaldırıldı' }).eq('id', Number(target_id));
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'post', target_id: String(target_id), decision: 'removed', reason: reason || 'Gönderi kaldırıldı', moderator_id: user.id, decision_code: rmPostCode,
          });
        } catch {}
        break;
      }

      case 'archive_post': {
        const archCode = await generateDecisionCode(admin);
        await admin.from('posts').update({ status: 'archived' }).eq('id', Number(target_id));
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'post', target_id: String(target_id), decision: 'archived', reason: reason || 'Gönderi arşivlendi', moderator_id: user.id, decision_code: archCode,
          });
        } catch {}
        break;
      }

      case 'approve_comment': {
        const appComCode = await generateDecisionCode(admin);
        const cId = Number(target_id);
        const { data: c } = await admin.from('comments').select('post_id').eq('id', cId).single();
        await admin.from('comments').update({ status: 'approved', is_nsfw: false }).eq('id', cId);
        if (c?.post_id) {
          const { count } = await admin
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', c.post_id)
            .eq('status', 'approved')
            .eq('is_nsfw', false);
          await admin.from('posts').update({ comment_count: count || 0 }).eq('id', c.post_id);
        }
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'comment', target_id: String(target_id), decision: 'approved', reason: reason || 'Yorum onaylandı', moderator_id: user.id, decision_code: appComCode,
          });
        } catch {}
        break;
      }

      case 'remove_comment': {
        const rmComCode = await generateDecisionCode(admin);
        const rmCId = Number(target_id);
        const { data: rmC } = await admin.from('comments').select('post_id').eq('id', rmCId).single();
        await admin.from('comments').update({ status: 'removed', is_nsfw: false }).eq('id', rmCId);
        if (rmC?.post_id) {
          const { count } = await admin
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', rmC.post_id)
            .eq('status', 'approved')
            .eq('is_nsfw', false);
          await admin.from('posts').update({ comment_count: count || 0 }).eq('id', rmC.post_id);
        }
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'comment', target_id: String(target_id), decision: 'removed', reason: reason || 'Yorum kaldırıldı', moderator_id: user.id, decision_code: rmComCode,
          });
        } catch {}
        break;
      }

      case 'warn_user': {
        const warnCode = await generateDecisionCode(admin);
        const { data: warnProfile } = await admin
          .from('profiles')
          .select('spam_score, role')
          .eq('user_id', target_id)
          .single();
        if (warnProfile && warnProfile.role !== 'admin') {
          await admin.from('profiles')
            .update({ spam_score: Math.min((warnProfile.spam_score || 0) + 20, 100) })
            .eq('user_id', target_id);
        }
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'warned', reason: reason || 'Kullanıcı uyarıldı (+20 spam puan)', moderator_id: user.id, decision_code: warnCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız uyarı aldı. Karar No: #${warnCode}` });
        } catch {}
        break;
      }

      case 'ban_user': {
        const banCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'blocked', spam_score: 100, moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'blocked', reason: reason || 'Hesap kapatıldı', moderator_id: user.id, decision_code: banCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız kapatıldı. Karar No: #${banCode}` });
        } catch {}

        // Auto-delete: 4+ bans in 30 days → permanent deletion
        try {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { count } = await admin
            .from('moderation_decisions')
            .select('id', { count: 'exact', head: true })
            .eq('target_type', 'user')
            .eq('target_id', String(target_id))
            .eq('decision', 'blocked')
            .gte('created_at', thirtyDaysAgo);

          if (count && count >= 4) {
            const deleteCode = await generateDecisionCode(admin);
            await admin.from('profiles')
              .update({ status: 'deleted', moderation_reason: 'Hesap 1 ay içinde 4 kez kapatıldığı için otomatik olarak silindi.' })
              .eq('user_id', target_id);
            await admin.from('moderation_decisions').insert({
              target_type: 'user', target_id: String(target_id), decision: 'deleted', reason: 'Otomatik silme: 1 ay içinde 4+ hesap kapatma', moderator_id: user.id, decision_code: deleteCode,
            });
            await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız silinme sırasına eklendi. Karar No: #${deleteCode}` });
          }
        } catch {}
        break;
      }

      case 'unban_user': {
        const unbanCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'active', spam_score: 0, moderation_reason: null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'approved', reason: reason || 'Hesap açıldı', moderator_id: user.id, decision_code: unbanCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız aktifleştirildi. Karar No: #${unbanCode}` });
          // Otomatik silme sayacını sıfırla: son 30 gündeki blocked kararlarını temizle
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          await admin.from('moderation_decisions')
            .delete()
            .eq('target_type', 'user')
            .eq('target_id', String(target_id))
            .eq('decision', 'blocked')
            .gte('created_at', thirtyDaysAgo);
        } catch {}
        break;
      }

      case 'verify_user':
        await admin.from('profiles')
          .update({ is_verified: true })
          .eq('user_id', target_id);
        break;

      case 'unverify_user':
        await admin.from('profiles')
          .update({ is_verified: false })
          .eq('user_id', target_id);
        break;

      case 'grant_premium': {
        const grantPlan = body.plan || 'max';
        const validPlans = ['super', 'pro', 'max', 'business'];
        if (!validPlans.includes(grantPlan)) {
          return NextResponse.json({ error: 'Geçersiz plan' }, { status: 400 });
        }
        const grantUntil = new Date();
        grantUntil.setDate(grantUntil.getDate() + 30);
        await admin.from('profiles')
          .update({ is_premium: true, is_verified: true, premium_plan: grantPlan, premium_until: grantUntil.toISOString() })
          .eq('user_id', target_id);
        try {
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: `Premium hediye edildi: ${grantPlan.charAt(0).toUpperCase() + grantPlan.slice(1)} (30 gün)` });
        } catch {}
        break;
      }

      case 'revoke_premium': {
        await admin.from('profiles')
          .update({ is_premium: false, premium_plan: null, premium_until: null })
          .eq('user_id', target_id);
        try {
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: 'Premium üyeliğiniz kaldırıldı.' });
        } catch {}
        break;
      }

      case 'resolve_report': {
        const resolveCode = await generateDecisionCode(admin);
        await admin.from('reports')
          .update({
            status: 'resolved',
            moderator_id: user.id,
            moderator_note: reason || null,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', Number(target_id));
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'report', target_id: String(target_id), decision: 'resolved', reason: reason || 'Rapor çözüldü', moderator_id: user.id, decision_code: resolveCode,
          });
        } catch {}
        break;
      }

      case 'dismiss_report': {
        const dismissCode = await generateDecisionCode(admin);
        await admin.from('reports')
          .update({
            status: 'dismissed',
            moderator_id: user.id,
            moderator_note: reason || null,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', Number(target_id));
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'report', target_id: String(target_id), decision: 'dismissed', reason: reason || 'Rapor reddedildi', moderator_id: user.id, decision_code: dismissCode,
          });
        } catch {}
        break;
      }

      case 'approve_withdrawal': {
        const appWCode = await generateDecisionCode(admin);
        const { data: withdrawal } = await admin
          .from('withdrawal_requests')
          .select('*')
          .eq('id', Number(target_id))
          .eq('status', 'pending')
          .single();

        if (withdrawal) {
          await admin.from('withdrawal_requests').update({
            status: 'completed',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          }).eq('id', withdrawal.id);
          try {
            await admin.from('moderation_decisions').insert({
              target_type: 'withdrawal', target_id: String(target_id), decision: 'approved', reason: reason || 'Çekim onaylandı', moderator_id: user.id, decision_code: appWCode,
            });
          } catch {}
        }
        break;
      }

      case 'reject_withdrawal': {
        const rejWCode = await generateDecisionCode(admin);
        const { data: rejectedW } = await admin
          .from('withdrawal_requests')
          .select('*')
          .eq('id', Number(target_id))
          .in('status', ['pending', 'processing'])
          .single();

        if (rejectedW) {
          const { data: refundProfile } = await admin
            .from('profiles')
            .select('coin_balance')
            .eq('user_id', rejectedW.user_id)
            .single();

          const refundBalance = (refundProfile?.coin_balance || 0) + rejectedW.amount;

          await Promise.all([
            admin.from('withdrawal_requests').update({
              status: 'rejected',
              reviewed_by: user.id,
              reviewed_at: new Date().toISOString(),
              rejection_reason: reason || null,
            }).eq('id', rejectedW.id),
            admin.from('profiles')
              .update({ coin_balance: refundBalance })
              .eq('user_id', rejectedW.user_id),
            admin.from('coin_transactions').insert({
              user_id: rejectedW.user_id,
              type: 'refund',
              amount: rejectedW.amount,
              balance_after: refundBalance,
              description: `Çekim talebi reddedildi: ${reason || 'Belirtilmedi'}`,
            }),
          ]);
          try {
            await admin.from('moderation_decisions').insert({
              target_type: 'withdrawal', target_id: String(target_id), decision: 'rejected', reason: reason || 'Çekim reddedildi', moderator_id: user.id, decision_code: rejWCode,
            });
          } catch {}
        }
        break;
      }

      case 'shadow_ban':
        await admin.from('profiles')
          .update({
            shadow_banned: true,
            shadow_banned_at: new Date().toISOString(),
            shadow_banned_by: user.id,
          })
          .eq('user_id', target_id);
        break;

      case 'unshadow_ban':
        await admin.from('profiles')
          .update({
            shadow_banned: false,
            shadow_banned_at: null,
            shadow_banned_by: null,
          })
          .eq('user_id', target_id);
        break;

      case 'freeze_user': {
        const freezeCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'frozen', frozen_at: new Date().toISOString(), moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'frozen', reason: reason || 'Hesap donduruldu', moderator_id: user.id, decision_code: freezeCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız donduruldu. Karar No: #${freezeCode}` });
        } catch {}
        break;
      }

      case 'unfreeze_user': {
        const unfreezeCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'active', frozen_at: null, moderation_reason: null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'approved', reason: reason || 'Hesap dondurması kaldırıldı', moderator_id: user.id, decision_code: unfreezeCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız aktifleştirildi. Karar No: #${unfreezeCode}` });
        } catch {}
        break;
      }

      case 'activate_user': {
        const activateCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'active', spam_score: 0, moderation_reason: null })
          .eq('user_id', target_id);
        // Log decision and notify
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'approved', reason: reason || 'Hesap aktifleştirildi', moderator_id: user.id, decision_code: activateCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız aktifleştirildi. Karar No: #${activateCode}` });
          // Otomatik silme sayacını sıfırla
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          await admin.from('moderation_decisions')
            .delete()
            .eq('target_type', 'user')
            .eq('target_id', String(target_id))
            .eq('decision', 'blocked')
            .gte('created_at', thirtyDaysAgo);
        } catch {}
        break;
      }

      case 'delete_user': {
        // Mark as deleted (soft delete) with reason and decision record
        const deleteDecisionCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'deleted', moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'deleted', reason: reason || 'Hesap silindi', moderator_id: user.id, decision_code: deleteDecisionCode,
          });
          await createNotification({
            admin, user_id: target_id, actor_id: target_id,
            type: 'account_moderation',
            content: `Hesabınız silinme sırasına eklendi. Karar No: #${deleteDecisionCode}`,
          });
        } catch {}
        break;
      }

      case 'moderation_user': {
        const modCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ status: 'moderation', moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'moderation', reason: reason || 'Hesap incelemesi', moderator_id: user.id, decision_code: modCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: `Hesabınız incelemeye alındı. Karar No: #${modCode}` });
        } catch {}
        break;
      }

      case 'remove_avatar': {
        const avCode = await generateDecisionCode(admin);
        await admin.from('profiles').update({ avatar_url: null }).eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'remove_avatar', reason: reason || 'Profil fotoğrafı kaldırıldı', moderator_id: user.id, decision_code: avCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: `Profil fotoğrafınız kaldırıldı. Karar No: #${avCode}` });
        } catch {}
        break;
      }

      case 'dismiss_content': {
        // Quick delete/dismiss from moderation — no formal decision record
        if (target_type === 'post') {
          await admin.from('posts')
            .update({ status: 'removed', is_nsfw: false, removed_at: new Date().toISOString(), removal_reason: 'Moderasyondan silindi' })
            .eq('id', Number(target_id));
          // Clean up related reports
          try { await admin.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(target_id)); } catch {}
        } else if (target_type === 'comment') {
          const { data: delC } = await admin.from('comments').select('post_id').eq('id', Number(target_id)).single();
          await admin.from('comments').delete().eq('id', Number(target_id));
          // Recalculate comment count
          if (delC?.post_id) {
            const { count } = await admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', delC.post_id).eq('status', 'approved').eq('is_nsfw', false);
            await admin.from('posts').update({ comment_count: count || 0 }).eq('id', delC.post_id);
          }
          try { await admin.from('reports').delete().eq('content_type', 'comment').eq('content_id', Number(target_id)); } catch {}
          // Resolve duplicate comments
          await resolveDuplicateComments(Number(target_id), 'dismiss');
        } else if (target_type === 'user') {
          // Dismiss profile from moderation queue — set to active
          await admin.from('profiles')
            .update({ status: 'active', moderation_reason: null })
            .eq('user_id', target_id);
        }
        // Resolve duplicate posts
        if (target_type === 'post') await resolveDuplicatePosts(Number(target_id), 'dismiss');
        break;
      }

      case 'restrict_follow': {
        const { data: prof } = await admin.from('profiles').select('restricted_follow').eq('user_id', target_id).single();
        const newVal = !(prof?.restricted_follow);
        await admin.from('profiles').update({ restricted_follow: newVal }).eq('user_id', target_id);
        const rfCode = await generateDecisionCode(admin);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: newVal ? 'restrict_follow' : 'unrestrict_follow', reason: reason || (newVal ? 'Takip engeli atandı' : 'Takip engeli kaldırıldı'), moderator_id: user.id, decision_code: rfCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: newVal ? `Takip etme özelliğiniz kısıtlandı. Karar No: #${rfCode}` : `Takip etme kısıtlamanız kaldırıldı. Karar No: #${rfCode}` });
        } catch {}
        break;
      }

      case 'restrict_like': {
        const { data: prof } = await admin.from('profiles').select('restricted_like').eq('user_id', target_id).single();
        const newVal = !(prof?.restricted_like);
        await admin.from('profiles').update({ restricted_like: newVal }).eq('user_id', target_id);
        const rlCode = await generateDecisionCode(admin);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: newVal ? 'restrict_like' : 'unrestrict_like', reason: reason || (newVal ? 'Beğeni engeli atandı' : 'Beğeni engeli kaldırıldı'), moderator_id: user.id, decision_code: rlCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: newVal ? `Beğeni özelliğiniz kısıtlandı. Karar No: #${rlCode}` : `Beğeni kısıtlamanız kaldırıldı. Karar No: #${rlCode}` });
        } catch {}
        break;
      }

      case 'revoke_copyright': {
        // Admin-only: revoke copyright eligibility
        const { data: modProfile2 } = await admin
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (modProfile2?.role !== 'admin') {
          return NextResponse.json({ error: 'Bu işlem yalnızca yöneticilere özeldir' }, { status: 403 });
        }

        await admin.from('profiles').update({
          copyright_eligible: false,
          copyright_revoked_by: user.id,
          copyright_revoked_at: new Date().toISOString(),
        }).eq('user_id', target_id);

        // Remove copyright_protected from all user's posts
        await admin.from('posts').update({
          copyright_protected: false,
          copyright_claim_status: null,
        }).eq('author_id', target_id).eq('copyright_protected', true);

        const revokeCode = await generateDecisionCode(admin);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'revoke_copyright', reason: reason || 'Telif hakkı koruması kaldırıldı', moderator_id: user.id, decision_code: revokeCode,
          });
          await createNotification({
            admin, user_id: target_id, actor_id: target_id,
            type: 'copyright_revoked',
            content: `Telif hakkı korumanız kaldırıldı. Karar No: #${revokeCode}${reason ? `. Sebep: ${reason}` : ''}`,
          });
        } catch {}
        break;
      }

      case 'restrict_comment': {
        const { data: prof } = await admin.from('profiles').select('restricted_comment').eq('user_id', target_id).single();
        const newVal = !(prof?.restricted_comment);
        await admin.from('profiles').update({ restricted_comment: newVal }).eq('user_id', target_id);
        const rcCode = await generateDecisionCode(admin);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: newVal ? 'restrict_comment' : 'unrestrict_comment', reason: reason || (newVal ? 'Yorum engeli atandı' : 'Yorum engeli kaldırıldı'), moderator_id: user.id, decision_code: rcCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: newVal ? `Yorum özelliğiniz kısıtlandı. Karar No: #${rcCode}` : `Yorum kısıtlamanız kaldırıldı. Karar No: #${rcCode}` });
        } catch {}
        break;
      }

      default:
        return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, message: `${action} başarılı` });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
