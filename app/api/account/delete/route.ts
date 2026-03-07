import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTranslations } from 'next-intl/server'
import { verifyPuzzleToken } from '@/lib/puzzleCaptcha'
import { getUserPlan, isAdminPlan } from '@/lib/limits'

// In-memory rate limit: 1 delete request per user per 60 seconds
const deleteAttempts = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors")
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 })
    const admin = createAdminClient()
    const plan = await getUserPlan(admin, user.id)
    const isAdminUser = isAdminPlan(plan)

    const body = await req.json()

    // Handle account recovery
    if (body.action === 'recover') {
      const { data: profile } = await admin
        .from('profiles')
        .select('status')
        .eq('user_id', user.id)
        .single()

      if (!profile || profile.status !== 'deleted') {
        return NextResponse.json({ error: tErrors("accountNotDeleted") }, { status: 400 })
      }

      await admin.from('profiles').update({
        status: 'active',
        deleted_at: null,
      }).eq('user_id', user.id)

      const res = NextResponse.json({ success: true, status: 'active' })
      res.cookies.set('fdm-status', '', { maxAge: 0, path: '/' })
      return res
    }

    // Rate limit: 1 per minute per user
    const lastAttempt = deleteAttempts.get(user.id) || 0;
    if (!isAdminUser && Date.now() - lastAttempt < 60_000) {
      return NextResponse.json({ error: tErrors("tooFastAction") }, { status: 429 });
    }
    deleteAttempts.set(user.id, Date.now());

    // Verify captcha token
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!isAdminUser && (!body.captchaToken || !await verifyPuzzleToken(body.captchaToken, ip))) {
      return NextResponse.json({ error: tErrors("captchaFailed") }, { status: 403 })
    }

    // Password verification for account deletion
    if (!isAdminUser) {
      if (!body.password) {
        return NextResponse.json({ error: tErrors("passwordRequired") }, { status: 400 })
      }
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: body.password,
      })
      if (pwError) {
        return NextResponse.json({ error: tErrors("incorrectPassword") }, { status: 403 })
      }
    }

    const { reason } = body
    // Active boost check: cannot delete while ads are running
    const { data: activeBoost } = await admin
      .from('post_boosts')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'pending_review', 'paused'])
      .limit(1)
      .maybeSingle()

    if (!isAdminUser && activeBoost) {
      return NextResponse.json(
        { error: tErrors("activeBoostDeleteWarning") },
        { status: 400 }
      )
    }

    await admin.from('profiles')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('user_id', user.id)

    try {
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
      await admin.from('moderation_decisions').insert({
        target_type: 'user', target_id: user.id, decision: 'deleted', reason: reason || tErrors('userDeletedAccount'), moderator_id: user.id, decision_code: code,
      })
    } catch {}

    const res = NextResponse.json({ success: true, status: 'deleted' })
    res.cookies.set('fdm-status', 'deleted', { maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    return res
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }
}
