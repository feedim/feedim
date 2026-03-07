import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getTranslations } from 'next-intl/server';

async function getRecipientNotifT(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('language').eq('user_id', userId).single();
  return getTranslations({ locale: data?.language || 'en', namespace: 'notifications' });
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

async function verifyAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return profile?.role === 'admin' || profile?.role === 'moderator';
}

export async function GET(request: NextRequest) {
  try {
    const tErrors = await getTranslations('apiErrors');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const isAdminUser = await verifyAdmin(admin, user.id);
    if (!isAdminUser) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }
    const view = request.nextUrl.searchParams.get('view') || 'pending';

    if (view === 'all') {
      // All boosts + summary stats for admin dashboard
      const { data: allBoosts, error } = await admin
        .from('post_boosts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: tErrors('dataFetchFailed') }, { status: 500 });
      }

      const boostList = allBoosts || [];

      // Calculate summary stats
      const stats = {
        total: boostList.length,
        active: boostList.filter(b => b.status === 'active').length,
        pending: boostList.filter(b => b.status === 'pending_review').length,
        completed: boostList.filter(b => b.status === 'completed').length,
        rejected: boostList.filter(b => b.status === 'rejected').length,
        totalRevenue: boostList.filter(b => b.payment_status === 'completed').reduce((sum: number, b: any) => sum + (b.total_budget || 0), 0),
        totalImpressions: boostList.reduce((sum: number, b: any) => sum + (b.impressions || 0), 0),
        totalClicks: boostList.reduce((sum: number, b: any) => sum + (b.clicks || 0), 0),
      };

      // Enrich with post + author info
      const enriched = await Promise.all(
        boostList.map(async (boost: any) => {
          const [{ data: post }, { data: profile }] = await Promise.all([
            admin.from('posts').select('id, title, slug, content_type, status').eq('id', boost.post_id).single(),
            admin.from('profiles').select('username, full_name, avatar_url').eq('user_id', boost.user_id).single(),
          ]);
          return { ...boost, post, author: profile };
        })
      );

      return NextResponse.json({ boosts: enriched, stats });
    }

    if (view === 'refunds') {
      const { data: refundBoosts, error: refundError } = await admin
        .from('post_boosts')
        .select('*')
        .eq('status', 'refund_requested')
        .order('created_at', { ascending: true });

      if (refundError) {
        return NextResponse.json({ error: tErrors('dataFetchFailed') }, { status: 500 });
      }

      const enrichedRefunds = await Promise.all(
        (refundBoosts || []).map(async (boost: any) => {
          const [{ data: post }, { data: profile }] = await Promise.all([
            admin.from('posts').select('id, title, slug, content_type, status').eq('id', boost.post_id).single(),
            admin.from('profiles').select('username, full_name, avatar_url').eq('user_id', boost.user_id).single(),
          ]);
          return { ...boost, post, author: profile };
        })
      );

      return NextResponse.json({ boosts: enrichedRefunds });
    }

    // Default: pending_review only
    const { data: boosts, error } = await admin
      .from('post_boosts')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: tErrors('dataFetchFailed') }, { status: 500 });
    }

    // Fetch post and profile info for each boost
    const enriched = await Promise.all(
      (boosts || []).map(async (boost: any) => {
        const [{ data: post }, { data: profile }] = await Promise.all([
          admin.from('posts').select('id, title, slug, content_type, status').eq('id', boost.post_id).single(),
          admin.from('profiles').select('username, full_name, avatar_url, language, country').eq('user_id', boost.user_id).single(),
        ]);
        return { ...boost, post, author: profile };
      })
    );

    return NextResponse.json({ boosts: enriched });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations('apiErrors');
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    }

    const admin = createAdminClient();
    const isAdminUser = await verifyAdmin(admin, user.id);
    if (!isAdminUser) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }
    const tNotif = await getTranslations('notifications');
    const body = await request.json();
    const { action, boost_id, reason } = body;

    if (!action || !boost_id) {
      return NextResponse.json({ error: tErrors('missingParameters') }, { status: 400 });
    }

    // Fetch the boost
    const { data: boost, error: boostError } = await admin
      .from('post_boosts')
      .select('*')
      .eq('id', boost_id)
      .single();

    if (boostError || !boost) {
      return NextResponse.json({ error: tErrors('boostNotFound') }, { status: 404 });
    }

    if (!['pending_review', 'refund_requested'].includes(boost.status)) {
      return NextResponse.json({ error: tErrors('boostAlreadyProcessed') }, { status: 400 });
    }

    const tBoostUserNotif = await getRecipientNotifT(boost.user_id);
    const now = new Date();

    if (action === 'approve') {
      const endsAt = new Date(now.getTime() + boost.duration_days * 24 * 60 * 60 * 1000);

      const { error: updateError } = await admin
        .from('post_boosts')
        .update({
          status: 'active',
          starts_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          reviewed_by: user.id,
          reviewed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', boost_id);

      if (updateError) {
        return NextResponse.json({ error: tErrors('updateFailed') }, { status: 500 });
      }

      try {
        await createNotification({
          admin,
          user_id: boost.user_id,
          actor_id: user.id,
          type: 'boost_approved',
          object_type: 'post',
          object_id: boost.post_id,
          content: tBoostUserNotif('boostApproved', { code: boost.boost_code }),
        });
      } catch {}

      try {
        const code = await generateDecisionCode(admin);
        await admin.from('moderation_decisions').insert({
          target_type: 'boost', target_id: String(boost_id),
          decision: 'approved', reason: reason || tNotif('boostApproved', { code: boost.boost_code }),
          moderator_id: user.id, decision_code: code,
        });
      } catch {}

      return NextResponse.json({ success: true, message: tNotif('boostApproved', { code: boost.boost_code }) });
    } else if (action === 'reject') {
      const { error: updateError } = await admin
        .from('post_boosts')
        .update({
          status: 'refund_requested',
          rejection_reason: reason || null,
          reviewed_by: user.id,
          reviewed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', boost_id);

      if (updateError) {
        return NextResponse.json({ error: tErrors('updateFailed') }, { status: 500 });
      }

      try {
        await createNotification({
          admin,
          user_id: boost.user_id,
          actor_id: user.id,
          type: 'boost_rejected',
          object_type: 'post',
          object_id: boost.post_id,
          content: reason
            ? tBoostUserNotif('boostRejectedWithReason', { code: boost.boost_code, reason })
            : tBoostUserNotif('boostRejected', { code: boost.boost_code }),
        });
      } catch {}

      // Send refund notification
      try {
        await createNotification({
          admin,
          user_id: boost.user_id,
          actor_id: user.id,
          type: 'boost_payment',
          object_type: 'post',
          object_id: boost.post_id,
          content: tBoostUserNotif('boostRefundCreated', { code: boost.boost_code }),
        });
      } catch {}

      try {
        const code = await generateDecisionCode(admin);
        await admin.from('moderation_decisions').insert({
          target_type: 'boost', target_id: String(boost_id),
          decision: 'rejected', reason: reason || tNotif('boostRejected', { code: boost.boost_code }),
          moderator_id: user.id, decision_code: code,
        });
      } catch {}

      return NextResponse.json({ success: true, message: tNotif('boostRejected', { code: boost.boost_code }) });
    } else if (action === 'approve_refund') {
      if (boost.status !== 'refund_requested') {
        return NextResponse.json({ error: tErrors('refundRequestNotFound') }, { status: 400 });
      }
      await admin
        .from('post_boosts')
        .update({
          status: 'refunded',
          reviewed_by: user.id,
          reviewed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', boost_id);

      try {
        const code = await generateDecisionCode(admin);
        await admin.from('moderation_decisions').insert({
          target_type: 'boost', target_id: String(boost_id),
          decision: 'refund_approved', reason: reason || tNotif('refundApproved'),
          moderator_id: user.id, decision_code: code,
        });
      } catch {}

      return NextResponse.json({ success: true, message: tNotif('refundApproved') });
    } else if (action === 'reject_refund') {
      if (boost.status !== 'refund_requested') {
        return NextResponse.json({ error: tErrors('refundRequestNotFound') }, { status: 400 });
      }
      await admin
        .from('post_boosts')
        .update({
          status: 'pending_review',
          updated_at: now.toISOString(),
        })
        .eq('id', boost_id);

      try {
        const code = await generateDecisionCode(admin);
        await admin.from('moderation_decisions').insert({
          target_type: 'boost', target_id: String(boost_id),
          decision: 'refund_rejected', reason: reason || tNotif('refundRejectedReviewBack'),
          moderator_id: user.id, decision_code: code,
        });
      } catch {}

      return NextResponse.json({ success: true, message: tNotif('refundRejectedReviewBack') });
    }

    return NextResponse.json({ error: tErrors('invalidOperation') }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
