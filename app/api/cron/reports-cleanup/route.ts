import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE reports older than 30 days (any status)
export async function POST() {
  try {
    const admin = createAdminClient()
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await admin.from('reports').delete().lt('created_at', cutoff)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

