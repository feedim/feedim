import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COIN_MIN_WITHDRAWAL, COIN_TO_TRY_RATE, COIN_COMMISSION_RATE } from '@/lib/constants';
import { getUserPlan, isAdminPlan } from '@/lib/limits';
import { getTranslations } from 'next-intl/server';

const ALLOWED_PLANS = ['pro', 'max', 'business'];

// POST: Create withdrawal request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tErrors = await getTranslations("apiErrors");
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const tWithdrawal = await getTranslations("withdrawal");
    const body = await request.json();
    const { amount } = body;

    if (!amount) {
      return NextResponse.json({ error: tErrors("amountRequired") }, { status: 400 });
    }

    const coinAmount = Number(amount);
    if (isNaN(coinAmount) || coinAmount < COIN_MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: tErrors("minWithdrawalAmount", { min: COIN_MIN_WITHDRAWAL }) },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Premium plan check
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);
    if (!isAdminUser && !ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: tErrors("proRequired") },
        { status: 403 }
      );
    }

    // Get profile with MFA and IBAN info
    const { data: profile } = await admin
      .from('profiles')
      .select('coin_balance, profile_score, mfa_enabled, withdrawal_iban, withdrawal_holder_name, total_spent')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: tErrors("profileNotFound") }, { status: 404 });
    }

    // MFA check
    if (!isAdminUser && !profile.mfa_enabled) {
      return NextResponse.json(
        { error: tErrors("twoFactorRequired") },
        { status: 403 }
      );
    }

    // IBAN check
    if (!profile.withdrawal_iban || !profile.withdrawal_holder_name) {
      return NextResponse.json(
        { error: tErrors('saveIbanFirst') },
        { status: 400 }
      );
    }

    // Balance check
    if (profile.coin_balance < coinAmount) {
      return NextResponse.json({ error: tErrors('insufficientBalance') }, { status: 400 });
    }

    // Block withdrawal for low-score accounts
    if (!isAdminUser && (profile.profile_score ?? 100) < 20) {
      return NextResponse.json(
        { error: tErrors('accountUnderReviewNoWithdrawal') },
        { status: 403 }
      );
    }

    // Check for pending withdrawal
    const { count: pendingCount } = await admin
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    if (!isAdminUser && (pendingCount || 0) > 0) {
      return NextResponse.json(
        { error: tErrors("pendingWithdrawalExists") },
        { status: 400 }
      );
    }

    // Check if first withdrawal (no completed requests)
    const { count: completedCount } = await admin
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const isFirstWithdrawal = (completedCount || 0) === 0;

    const grossTry = coinAmount * COIN_TO_TRY_RATE;
    const commissionTry = Math.round(grossTry * COIN_COMMISSION_RATE * 100) / 100;
    const netTry = Math.round((grossTry - commissionTry) * 100) / 100;

    // Atomic coin balance deduction via RPC
    // The pending withdrawal check above (only 1 allowed) narrows the race window,
    // but we still use atomic increment for correctness.
    const { data: newBalance, error: deductError } = await admin.rpc("increment_coin_balance", {
      p_user_id: user.id,
      p_amount: -coinAmount,
    });

    if (deductError || newBalance == null) {
      return NextResponse.json({ error: tErrors("insufficientBalance") }, { status: 400 });
    }

    // Safety: if RPC allowed negative balance, reverse and reject
    if (newBalance < 0) {
      await admin.rpc("increment_coin_balance", {
        p_user_id: user.id,
        p_amount: coinAmount,
      });
      return NextResponse.json({ error: tErrors("insufficientBalance") }, { status: 400 });
    }

    await Promise.all([
      admin.from('coin_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -coinAmount,
        balance_after: newBalance,
        description: tWithdrawal("transactionDescription", { gross: grossTry.toFixed(2), commission: commissionTry.toFixed(2), net: netTry.toFixed(2) }),
      }),
      admin.from('withdrawal_requests').insert({
        user_id: user.id,
        amount: coinAmount,
        amount_try: netTry,
        commission_try: commissionTry,
        gross_try: grossTry,
        iban: profile.withdrawal_iban,
        iban_holder: profile.withdrawal_holder_name,
        status: 'pending',
      }),
    ]);

    return NextResponse.json({
      success: true,
      amount: coinAmount,
      gross_try: grossTry,
      commission_try: commissionTry,
      amount_try: netTry,
      new_balance: newBalance,
      is_first_withdrawal: isFirstWithdrawal,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// GET: List user's withdrawal requests + profile info
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tErrors = await getTranslations("apiErrors");
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();

    const [{ data: requests }, { data: profile }] = await Promise.all([
      admin
        .from('withdrawal_requests')
        .select('id, amount, amount_try, commission_try, gross_try, status, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('profiles')
        .select('coin_balance, mfa_enabled, is_premium, premium_plan, withdrawal_iban, withdrawal_holder_name, account_type, account_private')
        .eq('user_id', user.id)
        .single(),
    ]);

    // Fetch monetization_enabled separately (column may not exist yet)
    let monetizationEnabled = false;
    try {
      const { data: monData } = await admin
        .from('profiles')
        .select('monetization_enabled')
        .eq('user_id', user.id)
        .single();
      monetizationEnabled = monData?.monetization_enabled || false;
    } catch {}

    return NextResponse.json({
      requests: requests || [],
      profile: profile ? {
        coin_balance: profile.coin_balance || 0,
        mfa_enabled: profile.mfa_enabled || false,
        is_premium: profile.is_premium || false,
        premium_plan: profile.premium_plan || null,
        withdrawal_iban: profile.withdrawal_iban || '',
        withdrawal_holder_name: profile.withdrawal_holder_name || '',
        monetization_enabled: monetizationEnabled,
        account_type: profile.account_type || 'personal',
        account_private: profile.account_private || false,
      } : null,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// PUT: Save IBAN info to profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tErrors = await getTranslations("apiErrors");
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const body = await request.json();
    const { iban, holder_name, mfa_code } = body;

    if (!iban || !holder_name) {
      return NextResponse.json({ error: tErrors("ibanAndNameRequired") }, { status: 400 });
    }

    // Validate IBAN (TR format: TR + 24 digits + MOD 97-10 checksum)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(cleanIban)) {
      return NextResponse.json({ error: tErrors("invalidIbanFormat") }, { status: 400 });
    }
    // ISO 7064 MOD 97-10 checksum validation
    const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
    const numericStr = rearranged.replace(/[A-Z]/g, (ch: string) => String(ch.charCodeAt(0) - 55));
    let remainder = numericStr.slice(0, numericStr.length % 7 || 7);
    for (let i = remainder.length; i < numericStr.length; i += 7) {
      remainder = String(Number(remainder) % 97) + numericStr.slice(i, i + 7);
    }
    if (Number(remainder) % 97 !== 1) {
      return NextResponse.json({ error: tErrors("invalidIbanFormat") }, { status: 400 });
    }

    // Validate holder name
    const holderTrimmed = holder_name.trim();
    if (holderTrimmed.length < 2 || holderTrimmed.length > 100) {
      return NextResponse.json({ error: tErrors("invalidAccountHolderName") }, { status: 400 });
    }

    const admin = createAdminClient();

    // Premium check
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);
    if (!isAdminUser && !ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: tErrors("proRequired") },
        { status: 403 }
      );
    }

    if (!isAdminUser) {
      // Require MFA code for IBAN changes
      if (!mfa_code || typeof mfa_code !== 'string' || mfa_code.length !== 6) {
        return NextResponse.json({ error: tErrors("mfaCodeRequired") }, { status: 400 });
      }

      // Verify MFA code
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        return NextResponse.json({ error: tErrors("twoFactorRequiredForIban") }, { status: 403 });
      }
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (!challenge) {
        return NextResponse.json({ error: tErrors("mfaVerificationFailed") }, { status: 400 });
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: totpFactor.id, challengeId: challenge.id, code: mfa_code });
      if (verifyError) {
        return NextResponse.json({ error: tErrors("mfaVerificationFailed") }, { status: 400 });
      }
    }

    // MFA check
    const { data: profile } = await admin
      .from('profiles')
      .select('mfa_enabled')
      .eq('user_id', user.id)
      .single();

    if (!isAdminUser && !profile?.mfa_enabled) {
      return NextResponse.json(
        { error: tErrors("twoFactorRequiredForIban") },
        { status: 403 }
      );
    }

    // Save IBAN info
    const { error } = await admin
      .from('profiles')
      .update({
        withdrawal_iban: cleanIban,
        withdrawal_holder_name: holderTrimmed,
      })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: tErrors("recordFailed") }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// DELETE: Cancel pending withdrawal request
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tErrors = await getTranslations("apiErrors");
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const tWithdrawal = await getTranslations("withdrawal");
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');
    if (!requestId) return NextResponse.json({ error: tErrors("idRequired") }, { status: 400 });

    const admin = createAdminClient();

    // Get the withdrawal request
    const { data: withdrawal } = await admin
      .from('withdrawal_requests')
      .select('id, amount, status')
      .eq('id', Number(requestId))
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!withdrawal) {
      return NextResponse.json({ error: tErrors("pendingRequestNotFound") }, { status: 404 });
    }

    // Atomic cancel: only cancel if status is still 'pending' (prevents post-payment refund)
    const { data: cancelled, error: cancelErr } = await admin
      .from('withdrawal_requests')
      .update({ status: 'cancelled' })
      .eq('id', withdrawal.id)
      .eq('status', 'pending')
      .select('id, amount')
      .maybeSingle();

    if (cancelErr || !cancelled) {
      return NextResponse.json({ error: tErrors("pendingRequestNotFound") }, { status: 409 });
    }

    // Refund coins atomically via RPC to prevent race conditions
    const { data: newBalance } = await admin.rpc("increment_coin_balance", {
      p_user_id: user.id,
      p_amount: cancelled.amount,
    });

    if (newBalance != null) {
      await admin.from('coin_transactions').insert({
        user_id: user.id,
        type: 'refund',
        amount: cancelled.amount,
        balance_after: newBalance,
        description: tWithdrawal('refundCancelDescription'),
      });
    }

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
