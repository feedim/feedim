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
    const limit = tab === 'recent_users' || tab === 'recent_posts' ? 40 : 20;
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

      return NextResponse.json({ reports: reports || [], total: count || 0, page });
    }

    if (tab === 'flagged_posts') {
      const { data: posts, count } = await admin
        .from('posts')
        .select(`
          id, title, slug, status, is_nsfw, moderation_due_at, spam_score, quality_score, created_at,
          author:profiles!posts_author_id_fkey(user_id, username, full_name, avatar_url)
        `, { count: 'exact' })
        .eq('is_nsfw', true)
        .eq('status', 'published')
        .lte('moderation_due_at', new Date().toISOString())
        .order('moderation_due_at', { ascending: true })
        .range(offset, offset + limit - 1);

      return NextResponse.json({ posts: posts || [], total: count || 0, page });
    }

    if (tab === 'spam_users') {
      const { data: users, count } = await admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, spam_score, trust_level, status, post_count, created_at, shadow_banned', { count: 'exact' })
        .or('spam_score.gte.30,shadow_banned.eq.true')
        .order('spam_score', { ascending: false })
        .range(offset, offset + limit - 1);

      return NextResponse.json({ users: users || [], total: count || 0, page });
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

      return NextResponse.json({ withdrawals: withdrawals || [], total: count || 0, page });
    }

    if (tab === 'recent_users') {
      const { data: users, count } = await admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, status, role, is_verified, is_premium, premium_plan, spam_score, shadow_banned, post_count, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return NextResponse.json({ users: users || [], total: count || 0, page });
    }

    if (tab === 'recent_posts') {
      const { data: posts, count } = await admin
        .from('posts')
        .select(`
          id, title, slug, status, content_type, spam_score, view_count, like_count, comment_count, created_at,
          author:profiles!posts_author_id_fkey(username, full_name, avatar_url)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return NextResponse.json({ posts: posts || [], total: count || 0, page });
    }

    if (tab === 'overview') {
      const [
        { count: pendingReports },
        { count: flaggedPosts },
        { count: spamUsers },
        { count: pendingWithdrawals },
        { data: recentActions },
      ] = await Promise.all([
        admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('posts').select('id', { count: 'exact', head: true }).eq('is_nsfw', true).eq('status', 'published'),
        admin.from('profiles').select('user_id', { count: 'exact', head: true }).gte('spam_score', 30),
        admin.from('withdrawal_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
        admin.from('moderation_logs')
          .select('*, moderator:profiles!moderation_logs_moderator_id_fkey(username, full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      return NextResponse.json({
        pendingReports: pendingReports || 0,
        flaggedPosts: flaggedPosts || 0,
        spamUsers: spamUsers || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
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

    // Log the action
    await admin.from('moderation_logs').insert({
      moderator_id: user.id,
      action,
      target_type,
      target_id: String(target_id),
      reason: reason || null,
    });

    switch (action) {
      case 'approve_content': {
        // Create moderation decision record
        const { data: approveDecision } = await admin.from('moderation_decisions')
          .insert({ target_type, target_id: String(target_id), decision: 'approved', reason: reason || null, moderator_id: user.id })
          .select('id').single();

        if (target_type === 'post') {
          const { data: approvedPost } = await admin.from('posts')
            .update({ is_nsfw: false, moderation_due_at: null })
            .eq('id', Number(target_id))
            .select('author_id, title, slug').single();

          if (approvedPost) {
            // Notification
            await createNotification({
              admin, user_id: approvedPost.author_id, actor_id: approvedPost.author_id,
              type: 'moderation_approved', object_type: 'post', object_id: Number(target_id),
              content: 'Gönderiniz onaylandı ve herkese açıldı.',
            });
            // Email
            const email = await getEmailIfEnabled(approvedPost.author_id, 'moderation_approved');
            if (email) {
              const tpl = moderationApprovedEmail(approvedPost.title, approvedPost.slug);
              await sendEmail({ to: email, ...tpl, template: 'moderation_approved', userId: approvedPost.author_id });
            }
          }
        } else if (target_type === 'comment') {
          await admin.from('comments').update({ is_nsfw: false }).eq('id', Number(target_id));
        }
        break;
      }

      case 'reject_content': {
        // Create moderation decision record
        const { data: rejectDecision } = await admin.from('moderation_decisions')
          .insert({ target_type, target_id: String(target_id), decision: 'removed', reason: reason || null, moderator_id: user.id })
          .select('id').single();

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
              content: `Gönderiniz kaldırıldı. Karar No: #${rejectDecision?.id || 0}. Sebep: ${reason || 'Belirtilmedi'}`,
            });
            // Email
            const email = await getEmailIfEnabled(rejectedPost.author_id, 'moderation_rejected');
            if (email) {
              const tpl = moderationRejectedEmail(rejectedPost.title, reason || '', rejectDecision?.id || 0);
              await sendEmail({ to: email, ...tpl, template: 'moderation_rejected', userId: rejectedPost.author_id });
            }
          }
        } else if (target_type === 'comment') {
          await admin.from('comments').update({ status: 'rejected' }).eq('id', Number(target_id));
        }
        break;
      }

      case 'approve_post':
        await admin.from('posts').update({ status: 'published' }).eq('id', Number(target_id));
        break;

      case 'remove_post':
        await admin.from('posts').update({ status: 'removed' }).eq('id', Number(target_id));
        break;

      case 'archive_post':
        await admin.from('posts').update({ status: 'archived' }).eq('id', Number(target_id));
        break;

      case 'approve_comment':
        await admin.from('comments').update({ status: 'approved' }).eq('id', Number(target_id));
        break;

      case 'remove_comment':
        await admin.from('comments').update({ status: 'removed' }).eq('id', Number(target_id));
        break;

      case 'warn_user': {
        // spam_score increment done manually
        const { data: warnProfile } = await admin
          .from('profiles')
          .select('spam_score')
          .eq('user_id', target_id)
          .single();
        if (warnProfile) {
          await admin.from('profiles')
            .update({ spam_score: Math.min((warnProfile.spam_score || 0) + 20, 100) })
            .eq('user_id', target_id);
        }
        break;
      }

      case 'ban_user':
        await admin.from('profiles')
          .update({ status: 'blocked', spam_score: 100 })
          .eq('user_id', target_id);
        break;

      case 'unban_user':
        await admin.from('profiles')
          .update({ status: 'active', spam_score: 0 })
          .eq('user_id', target_id);
        break;

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

      case 'grant_premium':
        const premiumUntil = new Date();
        premiumUntil.setMonth(premiumUntil.getMonth() + 1);
        await admin.from('profiles')
          .update({ is_premium: true, premium_plan: 'max', premium_until: premiumUntil.toISOString() })
          .eq('user_id', target_id);
        break;

      case 'revoke_premium':
        await admin.from('profiles')
          .update({ is_premium: false, premium_plan: null, premium_until: null })
          .eq('user_id', target_id);
        break;

      case 'resolve_report':
        await admin.from('reports')
          .update({
            status: 'resolved',
            moderator_id: user.id,
            moderator_note: reason || null,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', Number(target_id));
        break;

      case 'dismiss_report':
        await admin.from('reports')
          .update({
            status: 'dismissed',
            moderator_id: user.id,
            moderator_note: reason || null,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', Number(target_id));
        break;

      case 'approve_withdrawal':
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
        }
        break;

      case 'reject_withdrawal':
        const { data: rejectedW } = await admin
          .from('withdrawal_requests')
          .select('*')
          .eq('id', Number(target_id))
          .in('status', ['pending', 'processing'])
          .single();

        if (rejectedW) {
          // Refund coins
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
        }
        break;

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

      case 'freeze_user':
        await admin.from('profiles')
          .update({ status: 'frozen', frozen_at: new Date().toISOString() })
          .eq('user_id', target_id);
        break;

      case 'unfreeze_user':
        await admin.from('profiles')
          .update({ status: 'active', frozen_at: null })
          .eq('user_id', target_id);
        break;

      case 'delete_user':
        // Mark as deleted (soft delete)
        await admin.from('profiles')
          .update({ status: 'deleted' })
          .eq('user_id', target_id);
        break;

      case 'moderation_user':
        await admin.from('profiles')
          .update({ status: 'moderation' })
          .eq('user_id', target_id);
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz aksiyon' }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, message: `${action} başarılı` });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
