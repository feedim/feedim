import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BOOST_MIN_DAILY, BOOST_MAX_DAILY, BOOST_MAX_DAYS } from '@/lib/constants';
import { checkEmailVerified } from '@/lib/emailGate';
import { getUserPlan, isAdminPlan } from '@/lib/limits';
import { getTranslations } from 'next-intl/server';

// Rate limiter: 5 attempts per minute per user
const attempts = new Map<string, number[]>();
function checkBoostLimit(userId: string): boolean {
  const now = Date.now();
  const userAttempts = (attempts.get(userId) || []).filter(t => now - t < 60000);
  if (userAttempts.length >= 5) return false;
  userAttempts.push(now);
  attempts.set(userId, userAttempts);
  return true;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    const tErrors = await getTranslations("apiErrors");
    if (isNaN(postId)) {
      return NextResponse.json({ success: false, error: tErrors("invalidPost") }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: tErrors("unauthorizedAccess") }, { status: 401 });
    }
    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);

    if (!isAdminUser && !checkBoostLimit(user.id)) {
      return NextResponse.json({ success: false, error: tErrors("tooManyAttempts") }, { status: 429 });
    }

    // Professional account check — only creators and businesses can boost
    // Email verification check
    const emailCheck = await checkEmailVerified(admin, user.id, 'boost');
    if (!emailCheck.allowed) {
      return NextResponse.json({ success: false, error: emailCheck.error }, { status: 403 });
    }
    const { data: acctCheck } = await admin
      .from('profiles')
      .select('account_type')
      .eq('user_id', user.id)
      .single();

    if (!isAdminUser && (!acctCheck || (acctCheck.account_type !== 'creator' && acctCheck.account_type !== 'business'))) {
      return NextResponse.json({ success: false, error: tErrors("boostProfessionalOnly") }, { status: 403 });
    }

    const body = await request.json();
    const { goal, daily_budget, duration_days, target_countries, target_gender, age_min, age_max } = body;

    // Goal validasyonu
    const validGoals = ['likes', 'views', 'comments', 'profile_visits', 'reads', 'website_visits'];
    if (!goal || !validGoals.includes(goal)) {
      return NextResponse.json({ success: false, error: tErrors("invalidTargetSelection") }, { status: 400 });
    }

    // Validasyon
    if (!daily_budget || typeof daily_budget !== 'number' || daily_budget < BOOST_MIN_DAILY || daily_budget > BOOST_MAX_DAILY) {
      return NextResponse.json({ success: false, error: tErrors("dailyBudgetRange", { min: BOOST_MIN_DAILY, max: BOOST_MAX_DAILY }) }, { status: 400 });
    }

    if (!duration_days || typeof duration_days !== 'number' || duration_days < 1 || duration_days > BOOST_MAX_DAYS) {
      return NextResponse.json({ success: false, error: tErrors("durationRange", { max: BOOST_MAX_DAYS }) }, { status: 400 });
    }

    // Check post status — only published, non-NSFW, public posts can be boosted
    const { data: postCheck } = await admin
      .from('posts')
      .select('id, author_id, status, visibility, is_nsfw')
      .eq('id', postId)
      .single();

    if (!postCheck) {
      return NextResponse.json({ success: false, error: tErrors("postNotFound") }, { status: 404 });
    }
    if (postCheck.author_id !== user.id) {
      return NextResponse.json({ success: false, error: tErrors("postNotOwned") }, { status: 403 });
    }
    if (postCheck.status !== 'published') {
      return NextResponse.json({ success: false, error: tErrors("onlyPublishedCanBoost") }, { status: 400 });
    }
    if (postCheck.is_nsfw) {
      return NextResponse.json({ success: false, error: tErrors("moderationCannotBoost") }, { status: 400 });
    }
    if (postCheck.visibility && postCheck.visibility !== 'public') {
      return NextResponse.json({ success: false, error: tErrors("onlyPublicCanBoost") }, { status: 400 });
    }

    // Ödeme sistemi geçici olarak devre dışı (iyzico entegrasyonuna hazırlık)
    return NextResponse.json({ success: false, error: tErrors("paymentSystemComingSoon") }, { status: 503 });
  } catch {
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    const tErrors = await getTranslations("apiErrors");
    if (isNaN(postId)) {
      return NextResponse.json({ success: false, error: tErrors("invalidPost") }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: tErrors("unauthorizedAccess") }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: boost } = await admin
      .from('post_boosts')
      .select('id, post_id, user_id, goal, daily_budget, duration_days, total_budget, spent_budget, impressions, clicks, status, payment_status, starts_at, started_at, ends_at, paused_at, boost_code, target_countries, target_gender, age_min, age_max, created_at')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ success: true, boost: boost || null });
  } catch {
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}

// PATCH: Pause / Resume / Request Refund
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    const tErrors = await getTranslations("apiErrors");
    const tNotif = await getTranslations("notifications");
    if (isNaN(postId)) {
      return NextResponse.json({ success: false, error: tErrors("invalidPost") }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: tErrors("unauthorizedAccess") }, { status: 401 });
    }

    const admin = createAdminClient();
    const body = await request.json();
    const { action, boost_id } = body;

    // Fetch the boost
    const { data: boost, error: boostError } = await admin
      .from('post_boosts')
      .select('id, post_id, user_id, daily_budget, duration_days, total_budget, spent_budget, status, payment_status, starts_at, started_at, ends_at, paused_at, boost_code, created_at')
      .eq('id', boost_id)
      .eq('user_id', user.id)
      .single();

    if (boostError || !boost) {
      return NextResponse.json({ success: false, error: tErrors("boostNotFound") }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'pause') {
      if (boost.status !== 'active') {
        return NextResponse.json({ success: false, error: tErrors("onlyActiveCanPause") }, { status: 400 });
      }
      await admin.from('post_boosts').update({ status: 'paused', updated_at: now }).eq('id', boost_id);
      return NextResponse.json({ success: true, message: tErrors("boostPaused") });
    }

    if (action === 'resume') {
      if (boost.status !== 'paused') {
        return NextResponse.json({ success: false, error: tErrors("onlyPausedCanResume") }, { status: 400 });
      }
      await admin.from('post_boosts').update({ status: 'active', updated_at: now }).eq('id', boost_id);
      return NextResponse.json({ success: true, message: tErrors("boostResumed") });
    }

    if (action === 'delete_boost') {
      // Only allow delete if boost is pending_review and hasn't started yet
      if (boost.status !== 'pending_review') {
        return NextResponse.json({ success: false, error: tErrors("onlyPendingCanDelete") }, { status: 400 });
      }
      if (boost.starts_at) {
        return NextResponse.json({ success: false, error: tErrors("startedCannotDelete") }, { status: 400 });
      }
      await admin.from('post_boosts').update({ status: 'refund_requested', updated_at: now }).eq('id', boost_id);

      // Send notification
      try {
        const { createNotification } = await import('@/lib/notifications');
        await createNotification({
          admin,
          user_id: boost.user_id,
          actor_id: boost.user_id,
          type: 'boost_payment',
          object_type: 'post',
          object_id: boost.post_id,
          content: tNotif("adDeletedRefundCreated", { code: boost.boost_code }),
        });
      } catch {}

      return NextResponse.json({ success: true, message: tNotif("adDeletedRefundCreated", { code: boost.boost_code }) });
    }

    return NextResponse.json({ success: false, error: tErrors("invalidOperation") }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: "server_error" }, { status: 500 });
  }
}
