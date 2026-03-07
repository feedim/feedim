import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeError } from '@/lib/apiError';
import { buildPrivateCacheControl, FRESHNESS_WINDOWS } from '@/lib/freshnessPolicy';
import { getTranslations } from 'next-intl/server';

export async function GET() {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const admin = createAdminClient();
    const { data } = await admin
      .from('copyright_applications')
      .select('id, user_id, status, full_name, id_number, company_name, company_tax_id, application_type, created_at, reviewed_at')
      .eq('user_id', user.id)
      .single();

    // Fetch decision code for rejected applications
    let decisionCode: string | null = null;
    if (data && data.status === 'rejected') {
      const { data: decision } = await admin
        .from('moderation_decisions')
        .select('decision_code')
        .eq('target_type', 'copyright_application')
        .eq('target_id', String(data.id))
        .eq('decision', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      decisionCode = decision?.decision_code || null;
    }

    const response = NextResponse.json({ application: data || null, decisionCode });
    response.headers.set("Cache-Control", buildPrivateCacheControl(FRESHNESS_WINDOWS.settingsDerivedPanel));
    return response;
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

    // Check if already copyright eligible
    const { data: profile } = await admin
      .from('profiles')
      .select('copyright_eligible')
      .eq('user_id', user.id)
      .single();

    if (profile?.copyright_eligible) {
      return NextResponse.json({ error: tErrors("alreadyHasCopyright") }, { status: 400 });
    }

    // Check for existing pending/approved application
    const { data: existing } = await admin
      .from('copyright_applications')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      return NextResponse.json({ error: tErrors("pendingOrApprovedApplication") }, { status: 400 });
    }

    const body = await request.json();
    const { company_name, contact_email, contact_phone, company_website, description, proof_urls } = body;

    // Validation
    if (!company_name || typeof company_name !== 'string' || company_name.trim().length < 2) {
      return NextResponse.json({ error: tErrors("companyNameMinLength") }, { status: 400 });
    }
    if (!contact_email || typeof contact_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email)) {
      return NextResponse.json({ error: tErrors("validEmailRequired") }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json({ error: tErrors("descriptionMinLength") }, { status: 400 });
    }

    // Validate proof_urls (max 5)
    const validProofUrls = Array.isArray(proof_urls)
      ? proof_urls.filter((u: unknown) => typeof u === 'string' && u.trim().length > 0).slice(0, 5)
      : [];

    // If rejected before, delete old application to allow re-apply
    if (existing && existing.status === 'rejected') {
      await admin.from('copyright_applications').delete().eq('id', existing.id);
    }

    const { data: application, error } = await admin
      .from('copyright_applications')
      .insert({
        user_id: user.id,
        company_name: company_name.trim().slice(0, 200),
        contact_email: contact_email.trim().slice(0, 200),
        contact_phone: contact_phone ? String(contact_phone).trim().slice(0, 50) : null,
        company_website: company_website ? String(company_website).trim().slice(0, 500) : null,
        description: description.trim().slice(0, 2000),
        proof_urls: validProofUrls.length > 0 ? validProofUrls : null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      return safeError(error);
    }

    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
