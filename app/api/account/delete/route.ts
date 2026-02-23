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

    await admin.from('profiles')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('user_id', user.id)

    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await admin.from('moderation_decisions').insert({
        target_type: 'user', target_id: user.id, decision: 'deleted', reason: reason || 'Kullanıcı hesabını sildi', moderator_id: user.id, decision_code: code,
      })
    } catch {}

    const res = NextResponse.json({ success: true, status: 'deleted' })
    res.cookies.set('fdm-status', 'deleted', { maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    return res
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

