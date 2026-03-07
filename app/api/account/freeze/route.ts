import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import { verifyPuzzleToken } from '@/lib/puzzleCaptcha'
import { getUserPlan, isAdminPlan } from '@/lib/limits'

export async function POST(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 })
    const admin = createAdminClient()
    const plan = await getUserPlan(admin, user.id)
    const isAdminUser = isAdminPlan(plan)

    const { reason, captchaToken } = await req.json()

    // Verify captcha token
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!isAdminUser && (!captchaToken || !await verifyPuzzleToken(captchaToken, ip))) {
      return NextResponse.json({ error: tErrors("captchaFailed") }, { status: 403 })
    }

    // Active boost check: cannot freeze while ads are running
    const { data: activeBoost } = await admin
      .from('post_boosts')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'pending_review', 'paused'])
      .limit(1)
      .maybeSingle()

    if (!isAdminUser && activeBoost) {
      return NextResponse.json(
        { error: tErrors("activeBoostCannotFreeze") },
        { status: 400 }
      )
    }

    // Self-freeze limit: max 2 times per month
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await admin
      .from('moderation_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'user')
      .eq('target_id', user.id)
      .eq('moderator_id', user.id)
      .eq('decision', 'frozen')
      .gte('created_at', thirtyDaysAgo)

    if (!isAdminUser && count && count >= 2) {
      return NextResponse.json(
        { error: tErrors("freezeMonthlyLimit") },
        { status: 429 }
      )
    }

    await admin.from('profiles')
      .update({ status: 'frozen', frozen_at: new Date().toISOString() })
      .eq('user_id', user.id)

    try {
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
      await admin.from('moderation_decisions').insert({
        target_type: 'user', target_id: user.id, decision: 'frozen', reason: reason || tErrors('userFrozeAccount'), moderator_id: user.id, decision_code: code,
      })
    } catch {}

    const res = NextResponse.json({ success: true, status: 'frozen' })
    res.cookies.set('fdm-status', 'frozen', { maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    return res
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
