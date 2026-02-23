import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { reason } = await req.json()
    const admin = createAdminClient()

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

    if (count && count >= 2) {
      return NextResponse.json(
        { error: 'Hesabınızı ayda en fazla 2 kez dondurabilirsiniz.' },
        { status: 429 }
      )
    }

    await admin.from('profiles')
      .update({ status: 'frozen', frozen_at: new Date().toISOString() })
      .eq('user_id', user.id)

    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await admin.from('moderation_decisions').insert({
        target_type: 'user', target_id: user.id, decision: 'frozen', reason: reason || 'Kullanıcı hesabını dondurdu', moderator_id: user.id, decision_code: code,
      })
    } catch {}

    const res = NextResponse.json({ success: true, status: 'frozen' })
    res.cookies.set('fdm-status', 'frozen', { maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    return res
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
