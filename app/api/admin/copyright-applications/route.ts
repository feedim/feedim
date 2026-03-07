import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getTranslations } from 'next-intl/server';
import { logServerError } from '@/lib/runtimeLogger';

// Generate a sequential 6-digit decision code based on last human moderator decision
async function generateDecisionCode(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data } = await admin
    .from('moderation_decisions')
    .select('decision_code')
    .neq('moderator_id', 'system')
    .not('decision_code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastCode = data?.[0]?.decision_code;
  const lastNum = lastCode ? parseInt(lastCode, 10) : 0;
  const nextNum = (isNaN(lastNum) ? 0 : lastNum) + 1;
  return String(nextNum).padStart(6, '0');
}

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
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    if (!(await verifyAdmin(admin, user.id))) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'pending';

    const { data: apps, error: appsError } = await admin
      .from('copyright_applications')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (appsError) {
      logServerError('copyright_applications query error', appsError, {
        operation: 'list_copyright_applications',
      });
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
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    if (!(await verifyAdmin(admin, user.id))) {
      return NextResponse.json({ error: tErrors("forbidden") }, { status: 403 });
    }
    const body = await request.json();
    const { application_id, action, note } = body;

    if (!application_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: tErrors("invalidParameter") }, { status: 400 });
    }

    const { data: application } = await admin
      .from('copyright_applications')
      .select('*')
      .eq('id', application_id)
      .eq('status', 'pending')
      .single();

    if (!application) {
      return NextResponse.json({ error: tErrors("applicationNotFound") }, { status: 404 });
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
      const tNotif = await getTranslations("notifications");
      await createNotification({
        admin,
        user_id: application.user_id,
        actor_id: application.user_id,
        type: 'copyright_application_approved',
        content: tNotif("copyrightApplicationApproved"),
      });

      try {
        const tCopyright = await getTranslations("copyright");
        const code = await generateDecisionCode(admin);
        await admin.from('moderation_decisions').insert({
          target_type: 'copyright_application', target_id: String(application_id),
          decision: 'approved', reason: note || tCopyright("applicationApprovedReason"),
          moderator_id: user.id, decision_code: code,
        });
      } catch {}
    }

    if (action === 'reject') {
      await admin.from('copyright_applications').update({
        status: 'rejected',
        reviewer_id: user.id,
        reviewer_note: note || null,
        reviewed_at: new Date().toISOString(),
      }).eq('id', application_id);

      // Notify user
      const tNotif = await getTranslations("notifications");
      await createNotification({
        admin,
        user_id: application.user_id,
        actor_id: application.user_id,
        type: 'copyright_application_rejected',
        content: note ? tNotif("copyrightApplicationRejectedWithNote", { note }) : tNotif("copyrightApplicationRejected"),
      });

      try {
        const tCopyright = await getTranslations("copyright");
        const code = await generateDecisionCode(admin);
        await admin.from('moderation_decisions').insert({
          target_type: 'copyright_application', target_id: String(application_id),
          decision: 'rejected', reason: note || tCopyright("applicationRejectedReason"),
          moderator_id: user.id, decision_code: code,
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
