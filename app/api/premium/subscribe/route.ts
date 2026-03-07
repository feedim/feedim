import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getTranslations } from 'next-intl/server';

export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const body = await request.json();
    const { plan_id, payment_ref, coupon_code } = body;

    if (!plan_id) {
      return NextResponse.json({ error: tErrors("planNotSelected") }, { status: 400 });
    }

    // Payment verification: require a valid payment_ref (payment gateway must set this)
    if (!payment_ref || payment_ref === 'pending' || payment_ref.startsWith('pending_')) {
      return NextResponse.json({ error: tErrors("paymentRequired") }, { status: 402 });
    }

    const admin = createAdminClient();

    // Get plan details
    const { data: plan } = await admin
      .from('premium_plans')
      .select('id, name, price, period, is_active, features')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (!plan) {
      return NextResponse.json({ error: tErrors("planNotFound") }, { status: 404 });
    }

    // Check if user already has active subscription
    const { data: existingSub } = await admin
      .from('premium_subscriptions')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // Calculate expiry date
    const now = new Date();
    let expiresAt: Date;
    if (existingSub) {
      // Extend from current expiry
      expiresAt = new Date(existingSub.expires_at);
    } else {
      expiresAt = new Date(now);
    }

    if (plan.period === 'yil') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // Apply coupon if provided
    let discountPercent = 0;
    let couponId: number | null = null;
    if (coupon_code) {
      const { data: coupon } = await admin
        .from('coupons')
        .select('*')
        .eq('code', coupon_code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (coupon) {
        const validType = !coupon.applies_to || coupon.applies_to === `premium_${plan_id}`;
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > now;
        const notMaxed = !coupon.max_uses || coupon.current_uses < coupon.max_uses;

        // Check if user already used this coupon
        const { count: usageCount } = await admin
          .from('coupon_usages')
          .select('id', { count: 'exact', head: true })
          .eq('coupon_id', coupon.id)
          .eq('user_id', user.id);

        if (validType && notExpired && notMaxed && (usageCount || 0) === 0) {
          discountPercent = coupon.discount_percent;
          couponId = coupon.id;
        }
      }
    }

    const originalAmount = Number(plan.price);
    const discountAmount = discountPercent > 0 ? (originalAmount * discountPercent) / 100 : 0;
    const finalAmount = originalAmount - discountAmount;

    // Create subscription (upsert to prevent double-subscribe race condition)
    if (existingSub) {
      await admin
        .from('premium_subscriptions')
        .update({
          plan_id,
          expires_at: expiresAt.toISOString(),
          amount_paid: finalAmount,
        })
        .eq('id', existingSub.id);
    } else {
      // Use upsert with user_id conflict to prevent duplicate active subscriptions
      const { error: insertError } = await admin.from('premium_subscriptions').upsert({
        user_id: user.id,
        plan_id,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        payment_method: payment_ref || 'pending',
        amount_paid: finalAmount,
      }, { onConflict: 'user_id' });
      if (insertError) {
        return NextResponse.json({ error: tErrors("serverError") }, { status: 500 });
      }
    }

    // Create payment record
    const { data: payment } = await admin.from('premium_payments').insert({
      user_id: user.id,
      plan_id,
      amount_paid: finalAmount,
      status: 'completed',
      payment_method: payment_ref || 'pending',
      payment_ref: payment_ref || `pending_${Date.now()}`,
      completed_at: now.toISOString(),
    }).select('id').single();

    // Update profile premium status
    await admin
      .from('profiles')
      .update({
        is_premium: true,
        premium_plan: plan_id,
        premium_until: expiresAt.toISOString(),
      })
      .eq('user_id', user.id);

    // Record coupon usage (atomic increment to prevent race condition)
    if (couponId && payment) {
      await admin.from('coupon_usages').insert({
        coupon_id: couponId,
        user_id: user.id,
        payment_id: payment.id,
        discount_amount: discountAmount,
      });
      // Atomic increment — avoids read-modify-write race condition
      await admin.rpc('increment_coupon_uses', { coupon_id_param: couponId });
    }

    // Notification
    const tNotif = await getTranslations("notifications");
    await createNotification({
      admin,
      user_id: user.id,
      actor_id: user.id,
      type: 'premium_activated',
      content: tNotif("premiumWelcome", { plan: plan.name }),
    });

    return NextResponse.json({
      success: true,
      plan: plan.name,
      expires_at: expiresAt.toISOString(),
      amount_paid: finalAmount,
      discount: discountAmount,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// GET: Check subscription status
export async function GET() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const admin = createAdminClient();

    const { data: subscription } = await admin
      .from('premium_subscriptions')
      .select('*, premium_plans(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json({ active: false });
    }

    const isExpired = new Date(subscription.expires_at) < new Date();

    if (isExpired) {
      // Auto-expire
      await Promise.all([
        admin.from('premium_subscriptions')
          .update({ status: 'expired' })
          .eq('id', subscription.id),
        admin.from('profiles')
          .update({ is_premium: false, premium_plan: null, premium_until: null })
          .eq('user_id', user.id),
      ]);

      const tNotif = await getTranslations("notifications");
      await createNotification({
        admin,
        user_id: user.id,
        actor_id: user.id,
        type: 'premium_expired',
        content: tNotif("premiumExpired"),
      });

      return NextResponse.json({ active: false, expired: true });
    }

    return NextResponse.json({
      active: true,
      plan_id: subscription.plan_id,
      plan_name: subscription.premium_plans?.name,
      expires_at: subscription.expires_at,
      auto_renew: subscription.auto_renew,
      started_at: subscription.started_at,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// DELETE: Cancel subscription
export async function DELETE() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const admin = createAdminClient();

    const { data: subscription } = await admin
      .from('premium_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!subscription) {
      return NextResponse.json({ error: tErrors("noActiveSubscription") }, { status: 404 });
    }

    await admin
      .from('premium_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        auto_renew: false,
      })
      .eq('id', subscription.id);

    // Premium stays until expiry, just stop auto-renew
    const tNotif = await getTranslations("notifications");
    await createNotification({
      admin,
      user_id: user.id,
      actor_id: user.id,
      type: 'premium_cancelled',
      content: tNotif("premiumCancelled"),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
