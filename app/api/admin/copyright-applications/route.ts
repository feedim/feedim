import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

async function verifyAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return profile?.role === 'admin';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await verifyAdmin(admin, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'pending';

    const { data: apps, error: appsError } = await admin
      .from('copyright_applications')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (appsError) {
      if (process.env.NODE_ENV === "development") console.error('copyright_applications query error:', appsError);
      return NextResponse.json({ applications: [], total: 0 });
    }

    // Fetch profiles for each application
    const userIds = (apps || []).map((a: any) => a.user_id);
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('user_id, username, full_name, avatar_url, profile_score')
        .in('user_id', userIds);
      if (profiles) {
        for (const p of profiles) {
          profilesMap[p.user_id] = p;
        }
      }
    }

    const applications = (apps || []).map((a: any) => ({
      ...a,
      profiles: profilesMap[a.user_id] || null,
    }));

    return NextResponse.json({ applications, total: applications.length });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    if (!(await verifyAdmin(admin, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { application_id, action, note } = body;

    if (!application_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametre' }, { status: 400 });
    }

    const { data: application } = await admin
      .from('copyright_applications')
      .select('*')
      .eq('id', application_id)
      .eq('status', 'pending')
      .single();

    if (!application) {
      return NextResponse.json({ error: 'Başvuru bulunamadı' }, { status: 404 });
    }

    if (action === 'approve') {
      // Update application status
      await admin.from('copyright_applications').update({
        status: 'approved',
        reviewer_id: user.id,
        reviewer_note: note || null,
        reviewed_at: new Date().toISOString(),
      }).eq('id', application_id);

      // Grant copyright eligibility
      await admin.from('profiles').update({
        copyright_eligible: true,
        copyright_eligible_since: new Date().toISOString(),
      }).eq('user_id', application.user_id);

      // Notify user
      await createNotification({
        admin,
        user_id: application.user_id,
        actor_id: application.user_id,
        type: 'copyright_application_approved',
        content: 'Telif hakkı koruması başvurunuz onaylandı. Artık içeriklerinizi telif hakkıyla koruyabilirsiniz.',
      });
    }

    if (action === 'reject') {
      await admin.from('copyright_applications').update({
        status: 'rejected',
        reviewer_id: user.id,
        reviewer_note: note || null,
        reviewed_at: new Date().toISOString(),
      }).eq('id', application_id);

      // Notify user
      await createNotification({
        admin,
        user_id: application.user_id,
        actor_id: application.user_id,
        type: 'copyright_application_rejected',
        content: `Telif hakkı koruması başvurunuz reddedildi.${note ? ` Sebep: ${note}` : ''}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
