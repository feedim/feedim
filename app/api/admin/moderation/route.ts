import { NextRequest, NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { sendEmail, getEmailIfEnabled, moderationApprovedEmail, moderationRejectedEmail } from '@/lib/email';
import { reconcileSoundStatus } from '@/lib/soundLifecycle';
import { deleteFromR2, deleteR2Prefix, r2KeyFromUrl } from '@/lib/r2';
import { extractR2KeysFromContent } from '@/lib/postCleanup';
import { getTranslations } from 'next-intl/server';
import { syncTagCountsForStatusChange } from '@/lib/tagCounts';
import { logServerError } from '@/lib/runtimeLogger';

async function getRecipientLocale(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('language').eq('user_id', userId).single();
  return data?.language || 'en';
}

async function getRecipientNotifT(userId: string) {
  const locale = await getRecipientLocale(userId);
  return getTranslations({ locale, namespace: 'notifications' });
}

async function verifyAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  // Try with moderation_assignment first, fallback without it if column doesn't exist yet
  let profile: any = null;
  const { data: p1, error: e1 } = await admin
    .from('profiles')
    .select('role, moderation_country, moderation_assignment')
    .eq('user_id', userId)
    .single();
  if (e1 && (e1.message?.includes('moderation_assignment') || e1.code === 'PGRST204')) {
    const { data: p2 } = await admin
      .from('profiles')
      .select('role, moderation_country')
      .eq('user_id', userId)
      .single();
    profile = p2;
  } else {
    profile = p1;
  }
  if (profile?.role !== 'admin' && profile?.role !== 'moderator') return null;
  return { role: profile.role as string, moderationCountry: profile.moderation_country as string | null, moderationAssignment: (profile.moderation_assignment ?? null) as string | null };
}

function getCountryFilter(mod: { role: string; moderationCountry: string | null }): string | null {
  if (mod.role === 'admin') return null;
  return mod.moderationCountry || null;
}

// Check active boosts count for a user
async function countUserActiveBoosts(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<number> {
  try {
    const { count } = await admin
      .from('post_boosts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['active', 'pending_review', 'paused']);
    return count || 0;
  } catch { return 0; }
}

// Check active boosts count for a post
async function countPostActiveBoosts(admin: ReturnType<typeof createAdminClient>, postId: number): Promise<number> {
  try {
    const { count } = await admin
      .from('post_boosts')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId)
      .in('status', ['active', 'pending_review', 'paused']);
    return count || 0;
  } catch { return 0; }
}

// Generate a sequential 6-digit decision code based on last human moderator decision
async function generateDecisionCode(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from('moderation_decisions')
    .select('decision_code')
    .neq('moderator_id', 'system')
    .not('decision_code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastCode = data?.[0]?.decision_code;
  const lastNum = lastCode ? parseInt(lastCode, 10) : 0;
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return String(nextNum).padStart(6, '0');
}

// GET: Moderation queue — reported content, flagged posts, spam users
export async function GET(request: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    const moderator = await verifyAdmin(admin, user.id);
    if (!moderator) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }
    const countryFilter = getCountryFilter(moderator);

    const tab = request.nextUrl.searchParams.get('tab') || 'reports';

    // Check active boosts for a user or post (pre-action check)
    if (tab === 'check_boosts') {
      const targetType = request.nextUrl.searchParams.get('target_type');
      const targetId = request.nextUrl.searchParams.get('target_id') || '';
      if (targetType === 'user') {
        const count = await countUserActiveBoosts(admin, targetId);
        return NextResponse.json({ activeBoosts: count });
      } else if (targetType === 'post') {
        const count = await countPostActiveBoosts(admin, Number(targetId));
        return NextResponse.json({ activeBoosts: count });
      }
      return NextResponse.json({ activeBoosts: 0 });
    }

    // Return moderator's own assignment (any moderator can query this)
    if (tab === 'my_assignment') {
      return NextResponse.json({
        assignment: moderator.moderationAssignment,
        country: moderator.moderationCountry,
        role: moderator.role,
      });
    }

    // Tab access control based on assignment
    if (moderator.role !== 'admin') {
      const assignment = moderator.moderationAssignment;
      const tabsByAssignment: Record<string, string[]> = {
        review: ['flagged_posts', 'flagged_comments', 'moderation_users', 'reports', 'copyright_claims'],
        applications: ['monetization_apps', 'copyright_claims'],
        payments: ['withdrawals'],
        management: ['flagged_posts', 'flagged_comments', 'moderation_users', 'reports', 'copyright_claims',
                      'monetization_apps', 'withdrawals', 'recent_users', 'recent_posts', 'recent_comments', 'moderators'],
      };
      const allowed = assignment ? tabsByAssignment[assignment] : null;
      if (allowed && !allowed.includes(tab)) {
        return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
      }
    }

    const rawPage = Number(request.nextUrl.searchParams.get('page') || '1');
    const page = Math.max(1, Math.min(isNaN(rawPage) ? 1 : rawPage, 500));
    const limit = 10;
    const offset = (page - 1) * limit;

    if (tab === 'reports') {
      let reportsQuery = admin
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(username, full_name, avatar_url, language, country),
          content_author:profiles!reports_content_author_id_fkey${countryFilter ? '!inner' : ''}(username, full_name, avatar_url, language, country)
        `, { count: 'exact' })
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (countryFilter) reportsQuery = reportsQuery.eq('content_author.country', countryFilter);
      const { data: reports, count } = await reportsQuery;

      // Enrich reports with content slug/title for view links — mark deleted content
      const enrichedReports = await Promise.all((reports || []).map(async (r: any) => {
        if (r.content_type === 'post') {
          const { data: p } = await admin.from('posts').select('slug, title, content_type').eq('id', r.content_id).single();
          if (!p) return { ...r, _deleted: true };
          return { ...r, content_slug: p.slug, content_title: p.title, post_content_type: p.content_type };
        }
        if (r.content_type === 'comment') {
          const { data: c } = await admin.from('comments').select('content, post_id, author_id').eq('id', r.content_id).single();
          if (!c) return { ...r, _deleted: true };
          let comment_author_username: string | null = null;
          if (c.author_id) {
            const { data: ca } = await admin.from('profiles').select('username').eq('user_id', c.author_id).single();
            comment_author_username = ca?.username || null;
          }
          if (c.post_id) {
            const { data: p } = await admin.from('posts').select('slug').eq('id', c.post_id).single();
            return { ...r, content_slug: p?.slug, comment_text: c.content?.replace(/<[^>]+>/g, '').slice(0, 200), comment_author_username };
          }
          return { ...r, comment_text: c.content?.replace(/<[^>]+>/g, '').slice(0, 200), comment_author_username };
        }
        if (r.content_type === 'user') {
          const { data: profile } = await admin.from('profiles').select('user_id').eq('user_id', r.content_author_id).single();
          if (!profile) return { ...r, _deleted: true };
        }
        return r;
      }));

      // Auto-dismiss reports for deleted content — remove from moderator queue
      const deletedReports = enrichedReports.filter((r: any) => r._deleted);
      if (deletedReports.length > 0) {
        const deletedIds = deletedReports.map((r: any) => r.id);
        await admin.from('reports')
          .update({ status: 'auto_dismissed', resolved_at: new Date().toISOString() })
          .in('id', deletedIds);
      }
      const validReports = enrichedReports.filter((r: any) => !r._deleted);

      {
        const resp = NextResponse.json({ reports: validReports, total: Math.max(0, (count || 0) - deletedReports.length), page });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'flagged_posts') {
      let flaggedPostsQuery = admin
        .from('posts')
        .select(`
          id, title, slug, content_type, status, is_nsfw, moderation_due_at, moderation_reason, moderation_category, spam_score, quality_score, created_at, copyright_match_id, copyright_similarity,
          author:profiles!posts_author_id_fkey${countryFilter ? '!inner' : ''}(user_id, username, full_name, avatar_url, language, country)
        `, { count: 'exact' })
        .or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)')
        .order('moderation_due_at', { ascending: true, nullsFirst: false })
        .range(offset, offset + limit - 1);
      if (countryFilter) flaggedPostsQuery = flaggedPostsQuery.eq('author.country', countryFilter);
      const { data: posts, count } = await flaggedPostsQuery;

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
        ai_reason: p.moderation_reason || tErrors("reviewRequired"),
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
      let modUsersQuery = admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, status, role, moderation_reason, language, country, created_at, updated_at', { count: 'exact' })
        .in('status', ['moderation', 'blocked', 'deleted', 'frozen'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (countryFilter) modUsersQuery = modUsersQuery.eq('country', countryFilter);
      const { data: users, count } = await modUsersQuery;

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

    if (tab === 'monetization_apps') {
      const { data: applications } = await admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, profile_score, spam_score, monetization_applied_at, account_type')
        .eq('monetization_status', 'pending')
        .order('monetization_applied_at', { ascending: true })
        .limit(50);

      // Get post counts for each applicant
      const apps = await Promise.all(
        (applications || []).map(async (app: any) => {
          const { count } = await admin.from('posts').select('id', { count: 'exact', head: true })
            .eq('author_id', app.user_id).eq('status', 'published');
          return { ...app, post_count: count || 0 };
        })
      );

      const resp = NextResponse.json({ applications: apps });
      resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return resp;
    }

    if (tab === 'recent_users') {
      const rawQ = (request.nextUrl.searchParams.get('q') || '').trim();
      const q = rawQ.length >= 2 ? rawQ.replace(/[,.()"'\\;:@<>{}[\]|`~!#$^&*+=?/%]/g, '').slice(0, 50) : '';
      const searchLimit = 30;
      let usersQuery = admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, status, role, is_verified, is_premium, premium_plan, spam_score, shadow_banned, post_count, created_at')
        .order('created_at', { ascending: false })
        .limit(searchLimit);
      if (q) {
        usersQuery = usersQuery.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
      }
      const { data: users } = await usersQuery;

      {
        const resp = NextResponse.json({ users: users || [] });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'flagged_comments') {
      let flaggedCommentsQuery = admin
        .from('comments')
        .select(`
          id, content, content_type, gif_url, is_nsfw, status, post_id, author_id, created_at, moderation_reason, moderation_category,
          author:profiles!comments_author_id_fkey${countryFilter ? '!inner' : ''}(user_id, username, full_name, avatar_url, language, country),
          post:posts!comments_post_id_fkey(slug)
        `, { count: 'exact' })
        .eq('is_nsfw', true)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (countryFilter) flaggedCommentsQuery = flaggedCommentsQuery.eq('author.country', countryFilter);
      const { data: comments, count } = await flaggedCommentsQuery;

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
      const q = rawQ.length >= 2 ? rawQ.replace(/[,.()"'\\;:@<>{}[\]|`~!#$^&*+=?/%]/g, '').slice(0, 50) : '';
      const searchLimit = 30;
      let postsQuery = admin
        .from('posts')
        .select(`
          id, title, slug, status, content_type, spam_score, view_count, like_count, comment_count, created_at,
          author:profiles!posts_author_id_fkey(username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(searchLimit);
      if (q) {
        postsQuery = postsQuery.or(`title.ilike.%${q}%,slug.ilike.%${q}%`);
      }
      const { data: posts } = await postsQuery;

      {
        const resp = NextResponse.json({ posts: posts || [] });
        resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return resp;
      }
    }

    if (tab === 'recent_comments') {
      const rawQ = (request.nextUrl.searchParams.get('q') || '').trim();
      const q = rawQ.length >= 2 ? rawQ.slice(0, 50) : '';
      const searchLimit = 30;
      let commentsQuery = admin
        .from('comments')
        .select(`
          id, content, content_type, gif_url, status, post_id, created_at,
          author:profiles!comments_author_id_fkey(username, full_name, avatar_url),
          post:posts!comments_post_id_fkey(slug, title)
        `)
        .order('created_at', { ascending: false })
        .limit(searchLimit);
      if (q) {
        commentsQuery = commentsQuery.ilike('content', `%${q}%`);
      }
      const { data: comments } = await commentsQuery;
      const withSlug = (comments || []).map(c => {
        const post = Array.isArray(c.post) ? c.post[0] : c.post;
        return { ...c, post_slug: post?.slug || null, post_title: post?.title || null };
      });

      {
        const resp = NextResponse.json({ comments: withSlug });
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

    if (tab === 'moderators') {
      if (moderator.role !== 'admin') {
        return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
      }
      // Try with moderation_assignment first, fallback without it if column doesn't exist yet
      let modsData: any[] | null = null;
      const { data: d1, error: e1 } = await admin.from('profiles')
        .select('user_id, username, full_name, avatar_url, role, moderation_country, moderation_assignment, created_at')
        .eq('role', 'moderator')
        .order('created_at', { ascending: false });
      if (e1 && (e1.message?.includes('moderation_assignment') || e1.code === 'PGRST204')) {
        const { data: d2 } = await admin.from('profiles')
          .select('user_id, username, full_name, avatar_url, role, moderation_country, created_at')
          .eq('role', 'moderator')
          .order('created_at', { ascending: false });
        modsData = d2;
      } else {
        modsData = d1;
      }
      return NextResponse.json({ moderators: modsData || [] });
    }

    if (tab === 'overview') {
      const reportsCountQuery = countryFilter
        ? admin.from('reports').select('id, content_author:profiles!reports_content_author_id_fkey!inner(country)', { count: 'exact', head: true }).eq('status', 'pending').eq('content_author.country', countryFilter)
        : admin.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending');

      const flaggedPostsCountQuery = countryFilter
        ? admin.from('posts').select('id, author:profiles!posts_author_id_fkey!inner(country)', { count: 'exact', head: true }).or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)').eq('author.country', countryFilter)
        : admin.from('posts').select('id', { count: 'exact', head: true }).or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)');

      const modUsersCountQuery = countryFilter
        ? admin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'moderation').eq('country', countryFilter)
        : admin.from('profiles').select('user_id', { count: 'exact', head: true }).eq('status', 'moderation');

      const [
        reportsResult,
        flaggedPostsResult,
        // spamUsers removed
        modUsersResult,
        { count: pendingWithdrawals },
        { count: pendingCopyrightClaims },
        { data: recentActions },
      ] = await Promise.all([
        reportsCountQuery,
        flaggedPostsCountQuery,
        // spamUsers removed
        modUsersCountQuery,
        admin.from('withdrawal_requests').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
        admin.from('copyright_claims').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        admin.from('moderation_logs')
          .select('*, moderator:profiles!moderation_logs_moderator_id_fkey(username, full_name)')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      return NextResponse.json({
        pendingReports: reportsResult.count || 0,
        flaggedPosts: flaggedPostsResult.count || 0,
        // spamUsers removed
        moderationUsers: modUsersResult.count || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingCopyrightClaims: pendingCopyrightClaims || 0,
        recentActions: recentActions || [],
      });
    }

    return NextResponse.json({ error: tErrors("invalidTab") }, { status: 400 });
  } catch {
    return NextResponse.json({ error: tErrors("serverError") }, { status: 500 });
  }
}

// POST: Take moderation action
export async function POST(request: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  const tNotif = await getTranslations("notifications");
  const tAdmin = await getTranslations("adminModeration");
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    const moderator = await verifyAdmin(admin, user.id);
    if (!moderator) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }

    const body = await request.json();
    const { action, target_type, target_id, reason } = body;

    if (!action || !target_type || !target_id) {
      return NextResponse.json({ error: tAdmin("missingParameter") }, { status: 400 });
    }

    // Admin-only actions — moderators cannot perform these
    const adminOnlyActions = ['grant_premium', 'revoke_premium', 'delete_user', 'unverify_user', 'make_moderator', 'remove_moderator', 'set_moderator_country', 'set_moderator_assignment'];
    if (adminOnlyActions.includes(action)) {
      if (moderator.role !== 'admin') {
        return NextResponse.json({ error: tErrors("adminOnly") }, { status: 403 });
      }
    }

    // Assignment-based action restrictions for moderators
    if (moderator.role !== 'admin' && moderator.moderationAssignment) {
      const actionsByAssignment: Record<string, string[]> = {
        review: [
          'approve_content', 'reject_content', 'approve_post', 'remove_post',
          'approve_comment', 'remove_comment', 'dismiss_content', 'resolve_report', 'dismiss_report',
          'flag_for_moderation',
          'ban_user', 'unban_user', 'shadow_ban', 'unshadow_ban',
          'freeze_user', 'unfreeze_user', 'activate_user', 'moderation_user', 'remove_avatar',
          'restrict_follow', 'restrict_like', 'restrict_comment', 'revoke_copyright', 'verify_user',
        ],
        applications: [
          'approve_monetization', 'reject_monetization',
        ],
        payments: [
          'approve_withdrawal', 'reject_withdrawal',
        ],
      };
      // management: no extra restriction (all non-admin actions allowed)
      const allowedActions = actionsByAssignment[moderator.moderationAssignment];
      if (allowedActions && !allowedActions.includes(action)) {
        return NextResponse.json({ error: tErrors("outsideJurisdiction") }, { status: 403 });
      }
    }

    // Admin accounts and their content cannot be moderated
    const restrictedUserActions = ['ban_user', 'freeze_user', 'delete_user', 'moderation_user'];
    if (target_type === 'user' && restrictedUserActions.includes(action)) {
      const { data: targetProfile } = await admin
        .from('profiles')
        .select('role')
        .eq('user_id', target_id)
        .single();
      if (targetProfile?.role === 'admin') {
        return NextResponse.json({ error: tErrors("cannotModerateAdmin") }, { status: 403 });
      }
      // Moderatörler birbirlerine işlem yapamaz — admin veya yönetim atanmış moderatörler yapabilir
      const isManagementUser = moderator.role === 'admin' || moderator.moderationAssignment === 'management';
      if (targetProfile?.role === 'moderator' && !isManagementUser) {
        return NextResponse.json({ error: tErrors("onlyManagementModerateMod") }, { status: 403 });
      }
    }
    // Protect admin & moderator posts from removal/moderation by non-admins
    const restrictedPostActions = ['remove_post', 'flag_for_moderation'];
    if (target_type === 'post' && restrictedPostActions.includes(action)) {
      const { data: postData } = await admin.from('posts').select('author_id').eq('id', Number(target_id)).single();
      if (postData) {
        const { data: authorP } = await admin.from('profiles').select('role').eq('user_id', postData.author_id).single();
        if (authorP?.role === 'admin') {
          return NextResponse.json({ error: tErrors("adminContentCannotBeRemoved") }, { status: 403 });
        }
        const isManagement = moderator.role === 'admin' || moderator.moderationAssignment === 'management';
        if (authorP?.role === 'moderator' && !isManagement) {
          return NextResponse.json({ error: tErrors("modContentOnlyManagement") }, { status: 403 });
        }
      }
    }
    // Protect admin & moderator comments from removal/moderation by non-admins
    if (target_type === 'comment' && (action === 'remove_comment' || action === 'flag_for_moderation')) {
      const { data: comData } = await admin.from('comments').select('author_id').eq('id', Number(target_id)).single();
      if (comData?.author_id) {
        const { data: authorP } = await admin.from('profiles').select('role').eq('user_id', comData.author_id).single();
        if (authorP?.role === 'admin') {
          return NextResponse.json({ error: tErrors("adminContentCannotBeRemoved") }, { status: 403 });
        }
        const isManagement = moderator.role === 'admin' || moderator.moderationAssignment === 'management';
        if (authorP?.role === 'moderator' && !isManagement) {
          return NextResponse.json({ error: tErrors("modContentOnlyManagement") }, { status: 403 });
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
          .select('id, sound_id, status')
          .eq('author_id', srcPost.author_id)
          .eq('content_hash', srcPost.content_hash)
          .neq('id', postId)
          .or('status.eq.moderation,and(status.eq.published,is_nsfw.eq.true)');

        if (!dupes || dupes.length === 0) return;

        const soundIdsToReconcile = new Set<number>();
        for (const dupe of dupes) {
          if (decision === 'approve') {
            await admin.from('posts').update({ is_nsfw: false, moderation_due_at: null }).eq('id', dupe.id);
          } else if (decision === 'reject') {
            await admin.from('posts').update({ status: 'removed', is_nsfw: false, removed_at: new Date().toISOString(), removal_reason: rejectReason || null }).eq('id', dupe.id);
            await syncTagCountsForStatusChange(admin, dupe.id, dupe.status, 'removed');
          } else {
            await admin.from('posts').update({ status: 'removed', is_nsfw: false, removed_at: new Date().toISOString(), removal_reason: tNotif("removedFromModeration") }).eq('id', dupe.id);
            await syncTagCountsForStatusChange(admin, dupe.id, dupe.status, 'removed');
          }
          try { await admin.from('reports').delete().eq('content_type', 'post').eq('content_id', dupe.id); } catch {}
          if (dupe.sound_id) soundIdsToReconcile.add(dupe.sound_id);
        }
        // Reconcile sounds affected by duplicate resolution
        for (const sid of soundIdsToReconcile) {
          after(async () => {
            try { await reconcileSoundStatus(admin, sid); } catch {}
          });
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
          .insert({ target_type, target_id: String(target_id), decision: 'approved', reason: reason || tNotif("contentApprovedAfterReview"), moderator_id: user.id, decision_code: approveCode })
          .select('id').single();

        if (target_type === 'post') {
          // Ensure published_at is set when approving (may be null if content was cleared then re-submitted)
          const { data: preApprove } = await admin.from('posts').select('published_at, sound_id, status').eq('id', Number(target_id)).single();
          const approveUpdates: Record<string, any> = { status: 'published', is_nsfw: false, moderation_due_at: null, moderation_reason: null, moderation_category: null };
          if (!preApprove?.published_at) approveUpdates.published_at = new Date().toISOString();
          const { data: approvedPost } = await admin.from('posts')
            .update(approveUpdates)
            .eq('id', Number(target_id))
            .select('author_id, title, slug').single();
          await syncTagCountsForStatusChange(admin, Number(target_id), preApprove?.status, 'published');
          // Reconcile sound after approval
          if (preApprove?.sound_id) {
            const _sid = preApprove.sound_id as number;
            after(async () => { try { await reconcileSoundStatus(admin, _sid); } catch {} });
          }

          if (approvedPost) {
            // Notification
            const tAuthorNotif = await getRecipientNotifT(approvedPost.author_id);
            await createNotification({
              admin, user_id: approvedPost.author_id, actor_id: approvedPost.author_id,
              type: 'moderation_approved', object_type: 'post', object_id: Number(target_id),
              content: tAuthorNotif("postApprovedPublic"),
            });
            // Notify all reporters: no violation found
            try {
              const { data: reporters } = await admin
                .from('reports')
                .select('reporter_id')
                .eq('content_type', 'post')
                .eq('content_id', Number(target_id));
              for (const rep of reporters || []) {
                const tRepNotif = await getRecipientNotifT(rep.reporter_id);
                await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_dismissed', object_type: 'post', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
              }
              await admin.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(target_id));
            } catch {}
            // Email
            const emailResult = await getEmailIfEnabled(approvedPost.author_id, 'moderation_approved');
            if (emailResult) {
              const tpl = await moderationApprovedEmail(approvedPost.title, approvedPost.slug, emailResult.locale);
              await sendEmail({ to: emailResult.email, ...tpl, template: 'moderation_approved', userId: approvedPost.author_id });
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
            const tCommentAuthorNotif = await getRecipientNotifT(approvedComment.author_id);
            await createNotification({
              admin, user_id: approvedComment.author_id, actor_id: approvedComment.author_id,
              type: 'moderation_approved', object_type: 'comment', object_id: Number(target_id),
              content: tCommentAuthorNotif("commentApprovedPublic"),
            });
          }
          try {
            const { data: reps } = await admin
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_dismissed', object_type: 'comment', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
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
        // Block if post has active boosts — admin must cancel boost first
        if (target_type === 'post') {
          const rejectBoostCount = await countPostActiveBoosts(admin, Number(target_id));
          if (rejectBoostCount > 0) {
            return NextResponse.json({ error: tErrors("activeAdCancelFirst"), hasActiveBoosts: true }, { status: 400 });
          }
        }
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
          // Fetch sound_id before rejecting for lifecycle reconciliation
          const { data: preReject } = await admin.from('posts').select('sound_id, status').eq('id', Number(target_id)).single();
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
          await syncTagCountsForStatusChange(admin, Number(target_id), preReject?.status, 'removed');
          // Reconcile sound after rejection
          if (preReject?.sound_id) {
            const _sid = preReject.sound_id as number;
            after(async () => { try { await reconcileSoundStatus(admin, _sid); } catch {} });
          }

          // Note: boost check is done at the top of reject_content case — if we reach here, no active boosts exist

          if (rejectedPost) {
            // Notification
            const rejAuthorLocale = await getRecipientLocale(rejectedPost.author_id);
            const tRejAuthorNotif = await getTranslations({ locale: rejAuthorLocale, namespace: 'notifications' });
            const tRejAuthorAdmin = await getTranslations({ locale: rejAuthorLocale, namespace: 'adminModeration' });
            await createNotification({
              admin, user_id: rejectedPost.author_id, actor_id: rejectedPost.author_id,
              type: 'moderation_rejected', object_type: 'post', object_id: Number(target_id),
              content: tRejAuthorNotif("postRemovedDecision", { code: decisionCode, reason: reason || tRejAuthorAdmin("reasonNotSpecified") }),
            });
            // Notify all reporters: removed
            try {
              const { data: reporters } = await admin
                .from('reports')
                .select('reporter_id')
                .eq('content_type', 'post')
                .eq('content_id', Number(target_id));
              for (const rep of reporters || []) {
                const tRepNotif = await getRecipientNotifT(rep.reporter_id);
                await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: 'post', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
              }
            } catch {}
            // Email
            const emailResult = await getEmailIfEnabled(rejectedPost.author_id, 'moderation_rejected');
            if (emailResult) {
              const tpl = await moderationRejectedEmail(rejectedPost.title, reason || '', decisionCode, emailResult.locale);
              await sendEmail({ to: emailResult.email, ...tpl, template: 'moderation_rejected', userId: rejectedPost.author_id });
            }
            // Copyright/telif strike — moderator-triggered only
            const reasonLower = (reason || '').toLowerCase();
            if (reasonLower.includes('telif') || reasonLower.includes('copyright')) {
              try {
                const { data: authorProfile } = await admin
                  .from('profiles')
                  .select('copyright_strike_count')
                  .eq('user_id', rejectedPost.author_id)
                  .single();
                const newStrikeCount = (authorProfile?.copyright_strike_count || 0) + 1;
                const strikeUpdate: Record<string, unknown> = { copyright_strike_count: newStrikeCount };
                if (newStrikeCount >= 10) {
                  strikeUpdate.status = 'moderation';
                  strikeUpdate.moderation_reason = tNotif("copyrightStrikeViolation", { count: newStrikeCount });
                  try {
                    const strikeCode = String(Math.floor(100000 + Math.random() * 900000));
                    await admin.from('moderation_decisions').insert({
                      target_type: 'user', target_id: rejectedPost.author_id, decision: 'moderation', reason: tNotif("copyrightStrikeViolation", { count: newStrikeCount }), moderator_id: user.id, decision_code: strikeCode,
                    });
                  } catch {}
                }
                await admin.from('profiles').update(strikeUpdate).eq('user_id', rejectedPost.author_id);
              } catch {}
            }

            // R2 media cleanup (background)
            after(async () => {
              try {
                const { data: fullPost } = await admin.from('posts')
                  .select('featured_image, video_url, video_thumbnail, content')
                  .eq('id', Number(target_id)).single();
                if (fullPost) {
                  const keysToDelete: string[] = [];
                  for (const url of [fullPost.featured_image, fullPost.video_url, fullPost.video_thumbnail]) {
                    const key = r2KeyFromUrl(url);
                    if (key) keysToDelete.push(key);
                  }
                  if (fullPost.content) {
                    keysToDelete.push(...extractR2KeysFromContent(fullPost.content));
                  }
                  for (const key of keysToDelete) {
                    await deleteFromR2(key).catch(() => {});
                  }
                }
              } catch {}
            });
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
            const rejComLocale = await getRecipientLocale(rejectedComment.author_id);
            const tRejComNotif = await getTranslations({ locale: rejComLocale, namespace: 'notifications' });
            const tRejComAdmin = await getTranslations({ locale: rejComLocale, namespace: 'adminModeration' });
            await createNotification({
              admin, user_id: rejectedComment.author_id, actor_id: rejectedComment.author_id,
              type: 'moderation_rejected', object_type: 'comment', object_id: Number(target_id),
              content: tRejComNotif("commentRemovedDecision", { code: decisionCode, reason: reason || tRejComAdmin("reasonNotSpecified") }),
            });
          }
          try {
            const { data: reps } = await admin
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: 'comment', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
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

      case 'flag_for_moderation': {
        if (target_type === 'post') {
          await admin.from('posts').update({ is_nsfw: true, moderation_due_at: new Date().toISOString() }).eq('id', Number(target_id));
        } else if (target_type === 'comment') {
          await admin.from('comments').update({ is_nsfw: true }).eq('id', Number(target_id));
        }
        break;
      }

      case 'approve_post': {
        const appPostCode = await generateDecisionCode(admin);
        const { data: preApp } = await admin.from('posts').select('published_at, sound_id, status').eq('id', Number(target_id)).single();
        const appUpdates: Record<string, any> = { status: 'published' };
        if (!preApp?.published_at) appUpdates.published_at = new Date().toISOString();
        await admin.from('posts').update(appUpdates).eq('id', Number(target_id));
        await syncTagCountsForStatusChange(admin, Number(target_id), preApp?.status, 'published');
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'post', target_id: String(target_id), decision: 'approved', reason: reason || tNotif("postApprovedAfterReview"), moderator_id: user.id, decision_code: appPostCode,
          });
        } catch {}
        // Notify reporters: no violation found
        after(async () => {
          try {
            const admin2 = createAdminClient();
            const { data: reporters } = await admin2.from('reports').select('reporter_id').eq('content_type', 'post').eq('content_id', Number(target_id));
            const notified = new Set<string>();
            for (const rep of reporters || []) {
              if (notified.has(rep.reporter_id)) continue;
              notified.add(rep.reporter_id);
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_dismissed', object_type: 'post', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
            }
            await admin2.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(target_id));
          } catch {}
        });
        // Reconcile sound after approval
        if (preApp?.sound_id) {
          const _sid = preApp.sound_id as number;
          after(async () => { try { await reconcileSoundStatus(admin, _sid); } catch {} });
        }
        break;
      }

      case 'remove_post': {
        // Block if post has active boosts — admin must cancel boost first
        const rmBoostCount = await countPostActiveBoosts(admin, Number(target_id));
        if (rmBoostCount > 0) {
          return NextResponse.json({ error: tErrors("activeAdCancelFirst"), hasActiveBoosts: true }, { status: 400 });
        }
        const rmPostCode = await generateDecisionCode(admin);
        // Fetch sound_id before removing for lifecycle reconciliation
        const { data: preRemove } = await admin.from('posts').select('sound_id, status').eq('id', Number(target_id)).single();
        // Insert decision first to get ID
        let rmDecision: any = null;
        try {
          const ins = await admin.from('moderation_decisions')
            .insert({ target_type: 'post', target_id: String(target_id), decision: 'removed', reason: reason || tNotif("postRemovedViolation"), moderator_id: user.id, decision_code: rmPostCode })
            .select('id, decision_code').single();
          rmDecision = ins.data;
        } catch {}
        await admin.from('posts').update({
          status: 'removed',
          removed_at: new Date().toISOString(),
          removal_reason: reason || tNotif("postRemovedViolation"),
          removal_decision_id: rmDecision?.id || null,
        }).eq('id', Number(target_id));
        await syncTagCountsForStatusChange(admin, Number(target_id), preRemove?.status, 'removed');
        // Notification to post author
        try {
          const { data: rmPost } = await admin.from('posts').select('author_id').eq('id', Number(target_id)).single();
          if (rmPost) {
            const rmAuthorLocale = await getRecipientLocale(rmPost.author_id);
            const tRmAuthorNotif = await getTranslations({ locale: rmAuthorLocale, namespace: 'notifications' });
            const tRmAuthorAdmin = await getTranslations({ locale: rmAuthorLocale, namespace: 'adminModeration' });
            await createNotification({
              admin, user_id: rmPost.author_id, actor_id: rmPost.author_id,
              type: 'moderation_rejected', object_type: 'post', object_id: Number(target_id),
              content: tRmAuthorNotif("postRemovedDecision", { code: rmPostCode, reason: reason || tRmAuthorAdmin("reasonNotSpecified") }),
            });
          }
        } catch {}
        // Notify reporters: content removed
        after(async () => {
          try {
            const admin2 = createAdminClient();
            const { data: reporters } = await admin2.from('reports').select('reporter_id').eq('content_type', 'post').eq('content_id', Number(target_id));
            const notified = new Set<string>();
            for (const rep of reporters || []) {
              if (notified.has(rep.reporter_id)) continue;
              notified.add(rep.reporter_id);
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: 'post', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
            }
            await admin2.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(target_id));
          } catch {}
        });
        // Reconcile sound after removal
        if (preRemove?.sound_id) {
          const _sid = preRemove.sound_id as number;
          after(async () => { try { await reconcileSoundStatus(admin, _sid); } catch {} });
        }
        // R2 media cleanup (background)
        after(async () => {
          try {
            const { data: fullPost } = await admin.from('posts')
              .select('featured_image, video_url, video_thumbnail, content')
              .eq('id', Number(target_id)).single();
            if (fullPost) {
              const keysToDelete: string[] = [];
              for (const url of [fullPost.featured_image, fullPost.video_url, fullPost.video_thumbnail]) {
                const key = r2KeyFromUrl(url);
                if (key) keysToDelete.push(key);
              }
              if (fullPost.content) keysToDelete.push(...extractR2KeysFromContent(fullPost.content));
              for (const key of keysToDelete) await deleteFromR2(key).catch(() => {});
            }
          } catch {}
        });
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
            target_type: 'comment', target_id: String(target_id), decision: 'approved', reason: reason || tNotif("commentApprovedAfterReview"), moderator_id: user.id, decision_code: appComCode,
          });
        } catch {}
        // Notify reporters: no violation found
        after(async () => {
          try {
            const admin2 = createAdminClient();
            const { data: reporters } = await admin2.from('reports').select('reporter_id').eq('content_type', 'comment').eq('content_id', cId);
            const notified = new Set<string>();
            for (const rep of reporters || []) {
              if (notified.has(rep.reporter_id)) continue;
              notified.add(rep.reporter_id);
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_dismissed', object_type: 'comment', object_id: cId, content: tRepNotif("reportEvaluated") });
            }
            await admin2.from('reports').delete().eq('content_type', 'comment').eq('content_id', cId);
          } catch {}
        });
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
            target_type: 'comment', target_id: String(target_id), decision: 'removed', reason: reason || tNotif("commentRemovedViolation"), moderator_id: user.id, decision_code: rmComCode,
          });
        } catch {}
        // Notify reporters: comment removed
        after(async () => {
          try {
            const admin2 = createAdminClient();
            const { data: reporters } = await admin2.from('reports').select('reporter_id').eq('content_type', 'comment').eq('content_id', rmCId);
            const notified = new Set<string>();
            for (const rep of reporters || []) {
              if (notified.has(rep.reporter_id)) continue;
              notified.add(rep.reporter_id);
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: 'comment', object_id: rmCId, content: tRepNotif("reportEvaluated") });
            }
            await admin2.from('reports').delete().eq('content_type', 'comment').eq('content_id', rmCId);
          } catch {}
        });
        break;
      }

      case 'ban_user': {
        // Block if user has active boosts — admin must cancel boosts first
        const banBoostCount = await countUserActiveBoosts(admin, target_id);
        if (banBoostCount > 0) {
          return NextResponse.json({ error: tErrors("userActiveAdCancelFirst"), hasActiveBoosts: true }, { status: 400 });
        }
        const banCode = await generateDecisionCode(admin);
        const tBanTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'blocked', spam_score: 100, moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'blocked', reason: reason || tNotif("accountBannedViolation"), moderator_id: user.id, decision_code: banCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tBanTargetNotif("accountBannedDecision", { code: banCode }) });
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
              .update({ status: 'deleted', moderation_reason: tNotif("accountAutoDeleted4Freezes") })
              .eq('user_id', target_id);
            await admin.from('moderation_decisions').insert({
              target_type: 'user', target_id: String(target_id), decision: 'deleted', reason: tNotif("autoDelete4Bans"), moderator_id: user.id, decision_code: deleteCode,
            });
            await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tBanTargetNotif("accountDeletionQueueDecision", { code: deleteCode }) });
          }
        } catch {}
        break;
      }

      case 'unban_user': {
        const unbanCode = await generateDecisionCode(admin);
        const tUnbanTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'active', spam_score: 0, moderation_reason: null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'approved', reason: reason || tNotif("accountReactivatedAfterReview"), moderator_id: user.id, decision_code: unbanCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tUnbanTargetNotif("accountActivatedDecision", { code: unbanCode }) });
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

      case 'verify_user': {
        const verifyCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ is_verified: true })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'verified', reason: reason || tNotif("accountVerified"), moderator_id: user.id, decision_code: verifyCode,
          });
        } catch {}
        break;
      }

      case 'unverify_user': {
        const unverifyCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ is_verified: false })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'unverified', reason: reason || tNotif("accountUnverified"), moderator_id: user.id, decision_code: unverifyCode,
          });
        } catch {}
        break;
      }

      case 'grant_premium': {
        const grantPlan = body.plan || 'max';
        const validPlans = ['super', 'pro', 'max', 'business'];
        if (!validPlans.includes(grantPlan)) {
          return NextResponse.json({ error: tErrors("invalidPlan") }, { status: 400 });
        }
        const grantUntil = new Date();
        grantUntil.setDate(grantUntil.getDate() + 30);
        const grantCode = await generateDecisionCode(admin);
        const tGrantTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ is_premium: true, is_verified: true, premium_plan: grantPlan, premium_until: grantUntil.toISOString() })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'premium_granted', reason: reason || tNotif("premiumGiftedDescription", { plan: grantPlan }), moderator_id: user.id, decision_code: grantCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: tGrantTargetNotif("premiumGifted", { plan: grantPlan.charAt(0).toUpperCase() + grantPlan.slice(1) }) });
        } catch {}
        break;
      }

      case 'revoke_premium': {
        const revokeCode = await generateDecisionCode(admin);
        const tRevokeTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ is_premium: false, premium_plan: null, premium_until: null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'premium_revoked', reason: reason || tNotif("premiumRevokedByAdmin"), moderator_id: user.id, decision_code: revokeCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: tRevokeTargetNotif("premiumRevoked") });
        } catch {}
        break;
      }

      case 'resolve_report': {
        const resolveCode = await generateDecisionCode(admin);
        // Fetch the report to get content info
        const { data: resolveReport } = await admin.from('reports').select('content_type, content_id, content_author_id').eq('id', Number(target_id)).single();
        if (!resolveReport) break;

        // Resolve ALL pending reports for the same content
        let resolveQuery = admin.from('reports')
          .update({ status: 'resolved', moderator_id: user.id, moderator_note: reason || null, resolved_at: new Date().toISOString() })
          .eq('content_type', resolveReport.content_type)
          .eq('status', 'pending');
        if (resolveReport.content_type === 'user') {
          resolveQuery = resolveQuery.eq('content_author_id', resolveReport.content_author_id);
        } else {
          resolveQuery = resolveQuery.eq('content_id', resolveReport.content_id);
        }
        await resolveQuery;

        // Put content into moderation
        if (resolveReport.content_type === 'post') {
          await admin.from('posts').update({ is_nsfw: true, moderation_due_at: new Date().toISOString(), moderation_reason: reason || tNotif("moderationTakenCommunity") }).eq('id', resolveReport.content_id);
          const { data: flaggedPost } = await admin.from('posts').select('sound_id').eq('id', resolveReport.content_id).single();
          if (flaggedPost?.sound_id) {
            const _sid = flaggedPost.sound_id as number;
            after(async () => { try { await reconcileSoundStatus(createAdminClient(), _sid); } catch {} });
          }
        } else if (resolveReport.content_type === 'comment') {
          await admin.from('comments').update({ is_nsfw: true, moderation_reason: reason || tNotif("moderationTakenCommunity") }).eq('id', resolveReport.content_id);
        } else if (resolveReport.content_type === 'user' && resolveReport.content_author_id) {
          await admin.from('profiles').update({ status: 'moderation', moderation_reason: reason || tNotif("moderationTakenCommunity") }).eq('user_id', resolveReport.content_author_id);
        }

        try {
          const resolveDecisionTargetId = resolveReport.content_type === 'user'
            ? String(resolveReport.content_author_id)
            : String(resolveReport.content_id);
          await admin.from('moderation_decisions').insert({
            target_type: resolveReport.content_type, target_id: resolveDecisionTargetId, decision: 'flagged', reason: reason || tNotif("reportContentModeration"), moderator_id: user.id, decision_code: resolveCode,
          });
        } catch {}

        // Notify all reporters
        after(async () => {
          try {
            const admin2 = createAdminClient();
            let reporterQuery = admin2.from('reports').select('reporter_id').eq('content_type', resolveReport.content_type);
            if (resolveReport.content_type === 'user') {
              reporterQuery = reporterQuery.eq('content_author_id', resolveReport.content_author_id);
            } else {
              reporterQuery = reporterQuery.eq('content_id', resolveReport.content_id);
            }
            const { data: reporters } = await reporterQuery;
            const notified = new Set<string>();
            for (const rep of reporters || []) {
              if (notified.has(rep.reporter_id)) continue;
              notified.add(rep.reporter_id);
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: resolveReport.content_type, object_id: resolveReport.content_id, content: tRepNotif("reportEvaluated") });
            }
          } catch {}
        });
        break;
      }

      case 'dismiss_report': {
        const dismissCode = await generateDecisionCode(admin);
        // Fetch the report to get content info
        const { data: dismissReportData } = await admin.from('reports').select('content_type, content_id, content_author_id').eq('id', Number(target_id)).single();
        if (!dismissReportData) break;

        // Dismiss ALL pending reports for the same content
        let dismissQuery = admin.from('reports')
          .update({ status: 'dismissed', moderator_id: user.id, moderator_note: reason || null, resolved_at: new Date().toISOString() })
          .eq('content_type', dismissReportData.content_type)
          .eq('status', 'pending');
        if (dismissReportData.content_type === 'user') {
          dismissQuery = dismissQuery.eq('content_author_id', dismissReportData.content_author_id);
        } else {
          dismissQuery = dismissQuery.eq('content_id', dismissReportData.content_id);
        }
        await dismissQuery;

        try {
          const decisionTargetId = dismissReportData.content_type === 'user'
            ? String(dismissReportData.content_author_id)
            : String(dismissReportData.content_id);
          await admin.from('moderation_decisions').insert({
            target_type: dismissReportData.content_type, target_id: decisionTargetId, decision: 'dismissed', reason: reason || tNotif("reportDismissedNoViolation"), moderator_id: user.id, decision_code: dismissCode,
          });
        } catch {}

        // Notify all reporters
        after(async () => {
          try {
            const admin2 = createAdminClient();
            let dismissReporterQuery = admin2.from('reports').select('reporter_id').eq('content_type', dismissReportData.content_type);
            if (dismissReportData.content_type === 'user') {
              dismissReporterQuery = dismissReporterQuery.eq('content_author_id', dismissReportData.content_author_id);
            } else {
              dismissReporterQuery = dismissReporterQuery.eq('content_id', dismissReportData.content_id);
            }
            const { data: reporters } = await dismissReporterQuery;
            const notified = new Set<string>();
            for (const rep of reporters || []) {
              if (notified.has(rep.reporter_id)) continue;
              notified.add(rep.reporter_id);
              const tRepNotif = await getRecipientNotifT(rep.reporter_id);
              await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_dismissed', object_type: dismissReportData.content_type, object_id: dismissReportData.content_id, content: tRepNotif("reportEvaluated") });
            }
          } catch {}
        });
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
              target_type: 'withdrawal', target_id: String(target_id), decision: 'approved', reason: reason || tNotif("withdrawalApproved"), moderator_id: user.id, decision_code: appWCode,
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
          const rejWLocale = await getRecipientLocale(rejectedW.user_id);
          const tRejWNotif = await getTranslations({ locale: rejWLocale, namespace: 'notifications' });
          const tRejWAdmin = await getTranslations({ locale: rejWLocale, namespace: 'adminModeration' });
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
              description: tRejWNotif("withdrawalRejected", { reason: reason || tRejWAdmin("reasonNotSpecified") }),
            }),
          ]);
          try {
            await admin.from('moderation_decisions').insert({
              target_type: 'withdrawal', target_id: String(target_id), decision: 'rejected', reason: reason || tNotif("withdrawalRejectedDefault"), moderator_id: user.id, decision_code: rejWCode,
            });
          } catch {}
        }
        break;
      }

      case 'shadow_ban': {
        const shadowCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({
            shadow_banned: true,
            shadow_banned_at: new Date().toISOString(),
            shadow_banned_by: user.id,
          })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'shadow_banned', reason: reason || tNotif("visibilityRestricted"), moderator_id: user.id, decision_code: shadowCode,
          });
        } catch {}
        break;
      }

      case 'unshadow_ban': {
        const unshadowCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({
            shadow_banned: false,
            shadow_banned_at: null,
            shadow_banned_by: null,
          })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'shadow_ban_removed', reason: reason || tNotif("visibilityRestrictionRemoved"), moderator_id: user.id, decision_code: unshadowCode,
          });
        } catch {}
        break;
      }

      case 'freeze_user': {
        const freezeCode = await generateDecisionCode(admin);
        const tFreezeTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'frozen', frozen_at: new Date().toISOString(), moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'frozen', reason: reason || tNotif("accountFrozenSecurity"), moderator_id: user.id, decision_code: freezeCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tFreezeTargetNotif("accountFrozenDecision", { code: freezeCode }) });
        } catch {}
        break;
      }

      case 'unfreeze_user': {
        const unfreezeCode = await generateDecisionCode(admin);
        const tUnfreezeTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'active', frozen_at: null, moderation_reason: null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'approved', reason: reason || tNotif("accountUnfrozenReactivated"), moderator_id: user.id, decision_code: unfreezeCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tUnfreezeTargetNotif("accountActivatedDecision", { code: unfreezeCode }) });
        } catch {}
        break;
      }

      case 'activate_user': {
        const activateCode = await generateDecisionCode(admin);
        const tActivateTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'active', spam_score: 0, moderation_reason: null })
          .eq('user_id', target_id);
        // Log decision and notify
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'approved', reason: reason || tNotif("accountReactivatedAfterReview"), moderator_id: user.id, decision_code: activateCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tActivateTargetNotif("accountActivatedDecision", { code: activateCode }) });
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
        // Block if user has active boosts — admin must cancel boosts first
        const delBoostCount = await countUserActiveBoosts(admin, target_id);
        if (delBoostCount > 0) {
          return NextResponse.json({ error: tErrors("userActiveAdCancelFirst"), hasActiveBoosts: true }, { status: 400 });
        }
        // Mark as deleted (soft delete) with reason and decision record
        const deleteDecisionCode = await generateDecisionCode(admin);
        const tDeleteTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'deleted', moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'deleted', reason: reason || tNotif("accountDeletedViolation"), moderator_id: user.id, decision_code: deleteDecisionCode,
          });
          await createNotification({
            admin, user_id: target_id, actor_id: target_id,
            type: 'account_moderation',
            content: tDeleteTargetNotif("accountDeletionQueueDecision", { code: deleteDecisionCode }),
          });
        } catch {}
        break;
      }

      case 'moderation_user': {
        // Block if user has active boosts — admin must cancel boosts first
        const modBoostCount = await countUserActiveBoosts(admin, target_id);
        if (modBoostCount > 0) {
          return NextResponse.json({ error: tErrors("userActiveAdCancelFirst"), hasActiveBoosts: true }, { status: 400 });
        }
        const modCode = await generateDecisionCode(admin);
        const tModTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles')
          .update({ status: 'moderation', moderation_reason: reason || null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'moderation', reason: reason || tNotif("accountUnderReview"), moderator_id: user.id, decision_code: modCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'account_moderation', content: tModTargetNotif("accountUnderReviewDecision", { code: modCode }) });
        } catch {}
        break;
      }

      case 'remove_avatar': {
        const avCode = await generateDecisionCode(admin);
        const tAvTargetNotif = await getRecipientNotifT(target_id);
        // Delete avatar files from R2 before clearing DB
        try {
          const { data: avProfile } = await admin.from('profiles').select('avatar_url').eq('user_id', target_id).single();
          if (avProfile?.avatar_url) {
            const avKey = r2KeyFromUrl(avProfile.avatar_url);
            if (avKey) await deleteFromR2(avKey).catch(() => {});
          }
          await deleteR2Prefix(`images/avatars/${target_id}/`).catch(() => {});
        } catch {}
        await admin.from('profiles').update({ avatar_url: null }).eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'remove_avatar', reason: reason || tNotif("avatarRemovedViolation"), moderator_id: user.id, decision_code: avCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: tAvTargetNotif("avatarRemovedDecision", { code: avCode }) });
        } catch {}
        break;
      }

      case 'dismiss_content': {
        // Quick delete/dismiss from moderation — no formal decision record
        if (target_type === 'post') {
          // Block if post has active boosts — admin must cancel boost first
          const dismissBoostCount = await countPostActiveBoosts(admin, Number(target_id));
          if (dismissBoostCount > 0) {
            return NextResponse.json({ error: tErrors("activeAdCancelFirst"), hasActiveBoosts: true }, { status: 400 });
          }
          // Fetch sound_id before dismissing for lifecycle reconciliation
          const { data: preDismiss } = await admin.from('posts').select('sound_id, status').eq('id', Number(target_id)).single();
          await admin.from('posts')
            .update({ status: 'removed', is_nsfw: false, removed_at: new Date().toISOString(), removal_reason: tNotif("removedFromModeration") })
            .eq('id', Number(target_id));
          await syncTagCountsForStatusChange(admin, Number(target_id), preDismiss?.status, 'removed');
          // Notify reporters and clean up reports
          after(async () => {
            try {
              const admin2 = createAdminClient();
              const { data: reporters } = await admin2.from('reports').select('reporter_id').eq('content_type', 'post').eq('content_id', Number(target_id));
              const notified = new Set<string>();
              for (const rep of reporters || []) {
                if (notified.has(rep.reporter_id)) continue;
                notified.add(rep.reporter_id);
                const tRepNotif = await getRecipientNotifT(rep.reporter_id);
                await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: 'post', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
              }
              await admin2.from('reports').delete().eq('content_type', 'post').eq('content_id', Number(target_id));
            } catch {}
          });
          // Reconcile sound after dismissal
          if (preDismiss?.sound_id) {
            const _sid = preDismiss.sound_id as number;
            after(async () => { try { await reconcileSoundStatus(admin, _sid); } catch {} });
          }
          // R2 media cleanup (background)
          after(async () => {
            try {
              const { data: fullPost } = await admin.from('posts')
                .select('featured_image, video_url, video_thumbnail, content')
                .eq('id', Number(target_id)).single();
              if (fullPost) {
                const keysToDelete: string[] = [];
                for (const url of [fullPost.featured_image, fullPost.video_url, fullPost.video_thumbnail]) {
                  const key = r2KeyFromUrl(url);
                  if (key) keysToDelete.push(key);
                }
                if (fullPost.content) keysToDelete.push(...extractR2KeysFromContent(fullPost.content));
                for (const key of keysToDelete) await deleteFromR2(key).catch(() => {});
              }
            } catch {}
          });
        } else if (target_type === 'comment') {
          const { data: delC } = await admin.from('comments').select('post_id').eq('id', Number(target_id)).single();
          await admin.from('comments').delete().eq('id', Number(target_id));
          // Recalculate comment count
          if (delC?.post_id) {
            const { count } = await admin.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', delC.post_id).eq('status', 'approved').eq('is_nsfw', false);
            await admin.from('posts').update({ comment_count: count || 0 }).eq('id', delC.post_id);
          }
          // Notify reporters and clean up reports
          after(async () => {
            try {
              const admin2 = createAdminClient();
              const { data: reporters } = await admin2.from('reports').select('reporter_id').eq('content_type', 'comment').eq('content_id', Number(target_id));
              const notified = new Set<string>();
              for (const rep of reporters || []) {
                if (notified.has(rep.reporter_id)) continue;
                notified.add(rep.reporter_id);
                const tRepNotif = await getRecipientNotifT(rep.reporter_id);
                await createNotification({ admin: admin2, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'report_resolved', object_type: 'comment', object_id: Number(target_id), content: tRepNotif("reportEvaluated") });
              }
              await admin2.from('reports').delete().eq('content_type', 'comment').eq('content_id', Number(target_id));
            } catch {}
          });
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
        break;
      }

      case 'restrict_like': {
        const { data: prof } = await admin.from('profiles').select('restricted_like').eq('user_id', target_id).single();
        const newVal = !(prof?.restricted_like);
        await admin.from('profiles').update({ restricted_like: newVal }).eq('user_id', target_id);
        break;
      }

      case 'revoke_copyright': {
        // Admin-only: revoke copyright eligibility
        if (moderator.role !== 'admin') {
          return NextResponse.json({ error: tErrors("adminOnly") }, { status: 403 });
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
        const tCopyrightTargetNotif = await getRecipientNotifT(target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'revoke_copyright', reason: reason || tNotif("copyrightProtectionRevoked"), moderator_id: user.id, decision_code: revokeCode,
          });
          await createNotification({
            admin, user_id: target_id, actor_id: target_id,
            type: 'copyright_revoked',
            content: tCopyrightTargetNotif("copyrightRevokedDecision", { code: revokeCode, reason: reason || '' }),
          });
        } catch {}
        break;
      }

      case 'restrict_comment': {
        const { data: prof } = await admin.from('profiles').select('restricted_comment').eq('user_id', target_id).single();
        const newVal = !(prof?.restricted_comment);
        await admin.from('profiles').update({ restricted_comment: newVal }).eq('user_id', target_id);
        break;
      }

      case 'approve_monetization': {
        const monApproveCode = await generateDecisionCode(admin);
        const tMonApproveTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles').update({
          monetization_enabled: true,
          monetization_status: 'approved',
          monetization_approved_at: new Date().toISOString(),
        }).eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'monetization_approved', reason: reason || tNotif("monetizationApproved"), moderator_id: user.id, decision_code: monApproveCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: tMonApproveTargetNotif("monetizationApprovedUser") });
        } catch {}
        break;
      }

      case 'reject_monetization': {
        const monRejectCode = await generateDecisionCode(admin);
        const tMonRejectTargetNotif = await getRecipientNotifT(target_id);
        await admin.from('profiles').update({
          monetization_status: 'rejected',
        }).eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'monetization_rejected', reason: reason || tNotif("monetizationRejected"), moderator_id: user.id, decision_code: monRejectCode,
          });
          await createNotification({ admin, user_id: target_id, actor_id: target_id, type: 'system', content: tMonRejectTargetNotif("monetizationRejectedUser") });
        } catch {}
        break;
      }

      case 'make_moderator': {
        const mkModCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ role: 'moderator' })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'make_moderator', reason: reason || tNotif("moderatorAssigned"), moderator_id: user.id, decision_code: mkModCode,
          });
          await admin.from('moderation_logs').insert({
            moderator_id: user.id, action: 'make_moderator', target_type: 'user', target_id: String(target_id), reason: reason || tNotif("moderatorAssigned"),
          });
        } catch {}
        break;
      }

      case 'remove_moderator': {
        const rmModCode = await generateDecisionCode(admin);
        await admin.from('profiles')
          .update({ role: 'user', moderation_country: null })
          .eq('user_id', target_id);
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'remove_moderator', reason: reason || tNotif("moderatorRevoked"), moderator_id: user.id, decision_code: rmModCode,
          });
          await admin.from('moderation_logs').insert({
            moderator_id: user.id, action: 'remove_moderator', target_type: 'user', target_id: String(target_id), reason: reason || tNotif("moderatorRevoked"),
          });
        } catch {}
        break;
      }

      case 'set_moderator_country': {
        const scCode = await generateDecisionCode(admin);
        const newCountry = body.country || null;
        const { error: countryErr } = await admin.from('profiles')
          .update({ moderation_country: newCountry })
          .eq('user_id', target_id);
        if (countryErr) {
          logServerError('[moderation] set_moderator_country failed', countryErr, {
            operation: 'set_moderator_country',
          });
          return NextResponse.json({ error: tErrors("countrySaveFailed") }, { status: 500 });
        }
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'set_moderator_country', reason: reason || tNotif("dutyCountryAssigned", { country: newCountry || tNotif("dutyCountryAll") }), moderator_id: user.id, decision_code: scCode,
          });
          await admin.from('moderation_logs').insert({
            moderator_id: user.id, action: 'set_moderator_country', target_type: 'user', target_id: String(target_id), reason: tNotif("dutyCountryAssigned", { country: newCountry || tNotif("dutyCountryAll") }),
          });
        } catch {}
        break;
      }

      case 'set_moderator_assignment': {
        const saCode = await generateDecisionCode(admin);
        const newAssignment = body.assignment || null;
        const validAssignments = ['review', 'applications', 'payments', 'management'];
        if (newAssignment && !validAssignments.includes(newAssignment)) {
          return NextResponse.json({ error: tErrors("invalidDutyLocation") }, { status: 400 });
        }
        const { error: assignErr } = await admin.from('profiles')
          .update({ moderation_assignment: newAssignment })
          .eq('user_id', target_id);
        if (assignErr) {
          logServerError('[moderation] set_moderator_assignment failed', assignErr, {
            operation: 'set_moderator_assignment',
          });
          return NextResponse.json({ error: tErrors("dutyLocationSaveFailed") }, { status: 500 });
        }
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: String(target_id), decision: 'set_moderator_assignment', reason: reason || tNotif("dutyLocationAssigned", { location: newAssignment || tNotif("dutyLocationUnassigned") }), moderator_id: user.id, decision_code: saCode,
          });
          await admin.from('moderation_logs').insert({
            moderator_id: user.id, action: 'set_moderator_assignment', target_type: 'user', target_id: String(target_id), reason: tNotif("dutyLocationAssigned", { location: newAssignment || tNotif("dutyLocationUnassigned") }),
          });
        } catch {}
        break;
      }

      default:
        return NextResponse.json({ error: tErrors("invalidAction") }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, message: tNotif("actionSuccess", { action }) });
  } catch {
    return NextResponse.json({ error: tErrors("serverError") }, { status: 500 });
  }
}
