import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { COIN_MIN_WITHDRAWAL, COIN_TO_TRY_RATE, COIN_COMMISSION_RATE } from '@/lib/constants';
import { getUserPlan } from '@/lib/limits';

const ALLOWED_PLANS = ['pro', 'max', 'business'];

// POST: Create withdrawal request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const body = await request.json();
    const { amount } = body;

    if (!amount) {
      return NextResponse.json({ error: 'Miktar zorunludur' }, { status: 400 });
    }

    const coinAmount = Number(amount);
    if (isNaN(coinAmount) || coinAmount < COIN_MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum çekim miktarı ${COIN_MIN_WITHDRAWAL} jetondur` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Premium plan check
    const plan = await getUserPlan(admin, user.id);
    if (!ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: 'Ödeme almak için Pro veya üzeri plan gereklidir' },
        { status: 403 }
      );
    }

    // Get profile with MFA and IBAN info
    const { data: profile } = await admin
      .from('profiles')
      .select('coin_balance, profile_score, mfa_enabled, withdrawal_iban, withdrawal_holder_name')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
    }

    // MFA check
    if (!profile.mfa_enabled) {
      return NextResponse.json(
        { error: 'Çekim için iki faktörlü doğrulama zorunludur' },
        { status: 403 }
      );
    }

    // IBAN check
    if (!profile.withdrawal_iban || !profile.withdrawal_holder_name) {
      return NextResponse.json(
        { error: 'Önce IBAN bilgilerinizi kaydedin' },
        { status: 400 }
      );
    }

    // Balance check
    if (profile.coin_balance < coinAmount) {
      return NextResponse.json({ error: 'Yetersiz bakiye' }, { status: 400 });
    }

    // Block withdrawal for low-score accounts
    if ((profile.profile_score ?? 100) < 20) {
      return NextResponse.json(
        { error: 'Hesabınız inceleme altındadır. Çekim yapılamaz.' },
        { status: 403 }
      );
    }

    // Check for pending withdrawal
    const { count: pendingCount } = await admin
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    if ((pendingCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Zaten bekleyen bir çekim talebiniz var' },
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

    // Deduct coins from balance
    const newBalance = profile.coin_balance - coinAmount;

    await Promise.all([
      admin.from('profiles').update({
        coin_balance: newBalance,
        total_spent: (profile as any).total_spent + coinAmount,
      }).eq('user_id', user.id),
      admin.from('coin_transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: -coinAmount,
        balance_after: newBalance,
        description: `Nakit çekim: ${grossTry.toFixed(2)} TL (komisyon: ${commissionTry.toFixed(2)} TL, net: ${netTry.toFixed(2)} TL)`,
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
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// GET: List user's withdrawal requests + profile info
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const admin = createAdminClient();

    const [{ data: requests }, { data: profile }] = await Promise.all([
      admin
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('profiles')
        .select('coin_balance, mfa_enabled, is_premium, premium_plan, withdrawal_iban, withdrawal_holder_name')
        .eq('user_id', user.id)
        .single(),
    ]);

    return NextResponse.json({
      requests: requests || [],
      profile: profile ? {
        coin_balance: profile.coin_balance || 0,
        mfa_enabled: profile.mfa_enabled || false,
        is_premium: profile.is_premium || false,
        premium_plan: profile.premium_plan || null,
        withdrawal_iban: profile.withdrawal_iban || '',
        withdrawal_holder_name: profile.withdrawal_holder_name || '',
      } : null,
    });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// PUT: Save IBAN info to profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const body = await request.json();
    const { iban, holder_name } = body;

    if (!iban || !holder_name) {
      return NextResponse.json({ error: 'IBAN ve hesap sahibi adı zorunludur' }, { status: 400 });
    }

    // Validate IBAN (TR format: TR + 24 digits)
    const cleanIban = iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(cleanIban)) {
      return NextResponse.json({ error: 'Geçersiz IBAN formatı' }, { status: 400 });
    }

    // Validate holder name
    const holderTrimmed = holder_name.trim();
    if (holderTrimmed.length < 2 || holderTrimmed.length > 100) {
      return NextResponse.json({ error: 'Geçersiz hesap sahibi adı' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Premium check
    const plan = await getUserPlan(admin, user.id);
    if (!ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        { error: 'Ödeme almak için Pro veya üzeri plan gereklidir' },
        { status: 403 }
      );
    }

    // MFA check
    const { data: profile } = await admin
      .from('profiles')
      .select('mfa_enabled')
      .eq('user_id', user.id)
      .single();

    if (!profile?.mfa_enabled) {
      return NextResponse.json(
        { error: '2FA etkinleştirilmeden IBAN bilgisi kaydedilemez' },
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
      return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// DELETE: Cancel pending withdrawal request
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('id');
    if (!requestId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const admin = createAdminClient();

    // Get the withdrawal request
    const { data: withdrawal } = await admin
      .from('withdrawal_requests')
      .select('*')
      .eq('id', Number(requestId))
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!withdrawal) {
      return NextResponse.json({ error: 'Bekleyen talep bulunamadı' }, { status: 404 });
    }

    // Refund coins
    const { data: profile } = await admin
      .from('profiles')
      .select('coin_balance')
      .eq('user_id', user.id)
      .single();

    const newBalance = (profile?.coin_balance || 0) + withdrawal.amount;

    await Promise.all([
      admin.from('withdrawal_requests')
        .update({ status: 'cancelled' })
        .eq('id', withdrawal.id),
      admin.from('profiles')
        .update({ coin_balance: newBalance })
        .eq('user_id', user.id),
      admin.from('coin_transactions').insert({
        user_id: user.id,
        type: 'refund',
        amount: withdrawal.amount,
        balance_after: newBalance,
        description: 'Çekim talebi iptal iadesi',
      }),
    ]);

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
