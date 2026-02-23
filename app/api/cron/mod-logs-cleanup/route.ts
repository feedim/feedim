import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE moderation_logs older than 90 days, notifications older than 60 days, moderation_decisions older than 30 days
export async function POST() {
  try {
    const admin = createAdminClient()
    const cutoffLogs = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const cutoffNotifs = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    const cutoffDecisions = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    await Promise.all([
      admin.from('moderation_logs').delete().lt('created_at', cutoffLogs),
      admin.from('notifications').delete().lt('created_at', cutoffNotifs),
      admin.from('moderation_decisions').delete().lt('created_at', cutoffDecisions),
    ])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

