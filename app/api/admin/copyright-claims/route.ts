import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';
import { getTranslations } from 'next-intl/server';
import { syncTagCountsForStatusChange } from '@/lib/tagCounts';

async function verifyAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();
  return profile?.role === 'admin' || profile?.role === 'moderator';
}

// GET: List pending copyright claims with related data (admin only)
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

    const rawPage = Number(request.nextUrl.searchParams.get('page') || '1');
    const page = Math.max(1, Math.min(isNaN(rawPage) ? 1 : rawPage, 500));
    const limit = 10;
    const offset = (page - 1) * limit;

    // Fetch claims (no FK joins to profiles — claimant_id/matched_author_id reference auth.users, not profiles)
    const { data: rawClaims, count } = await admin
      .from('copyright_claims')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const claims = rawClaims || [];

    // Enrich with post + profile data
    const enriched = await Promise.all(claims.map(async (claim) => {
      const [postRes, claimantRes, matchedPostRes, matchedAuthorRes] = await Promise.all([
        admin.from('posts').select('id, title, slug, status, content_type, featured_image, video_thumbnail').eq('id', claim.post_id).single(),
        admin.from('profiles').select('user_id, username, full_name, avatar_url, language, country').eq('user_id', claim.claimant_id).single(),
        claim.matched_post_id ? admin.from('posts').select('id, title, slug, author_id').eq('id', claim.matched_post_id).single() : { data: null },
        claim.matched_author_id ? admin.from('profiles').select('user_id, username, full_name, avatar_url').eq('user_id', claim.matched_author_id).single() : { data: null },
      ]);
      return {
        ...claim,
        post: postRes.data,
        claimant: claimantRes.data,
        matched_post: matchedPostRes.data,
        matched_author: matchedAuthorRes.data,
      };
    }));

    const resp = NextResponse.json({ claims: enriched, total: count || 0, page });
    resp.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return resp;
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// POST: Verify or reject a copyright claim (admin only)
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
    const tCopyright = await getTranslations("copyright");
    const body = await request.json();
    const { action, claim_id, reason } = body;

    if (!action || !claim_id) {
      return NextResponse.json({ error: tErrors("missingParameterDetailed") }, { status: 400 });
    }

    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ error: tErrors("invalidActionDetailed") }, { status: 400 });
    }

    // Fetch the claim
    const { data: claim } = await admin
      .from('copyright_claims')
      .select('*')
      .eq('id', Number(claim_id))
      .eq('status', 'pending')
      .single();

    if (!claim) {
      return NextResponse.json({ error: tErrors("pendingCopyrightClaimNotFound") }, { status: 404 });
    }

    if (action === 'verify') {
      // Update claim status to verified
      await admin
        .from('copyright_claims')
        .update({
          status: 'verified',
          reviewer_id: user.id,
          reviewer_note: reason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', Number(claim_id));

      // Create copyright_verification record
      await admin
        .from('copyright_verifications')
        .upsert({
          post_id: claim.post_id,
          verified_by: claim.claimant_id,
          owner_name: claim.owner_name || tErrors('feedimUser'),
          company_name: claim.company_name || null,
          claim_id: claim.id,
        }, { onConflict: 'post_id' });

      // Update post: restore to published, clear NSFW, set copyright verified
      const { data: beforeRestore } = await admin
        .from('posts')
        .select('status')
        .eq('id', claim.post_id)
        .single();

      await admin
        .from('posts')
        .update({
          status: 'published',
          is_nsfw: false,
          copyright_claim_status: 'verified',
        })
        .eq('id', claim.post_id);
      await syncTagCountsForStatusChange(admin, claim.post_id, beforeRestore?.status, 'published');

      // Notify the claimant
      const tNotif = await getTranslations("notifications");
      await createNotification({
        admin,
        user_id: claim.claimant_id,
        actor_id: claim.claimant_id,
        type: 'copyright_verified',
        object_type: 'post',
        object_id: claim.post_id,
        content: tNotif("copyrightClaimVerified"),
      });

      // Log moderation action
      await admin.from('moderation_logs').insert({
        moderator_id: user.id,
        action: 'copyright_verify',
        target_type: 'post',
        target_id: String(claim.post_id),
        reason: reason || tCopyright("claimVerified"),
      });

      return NextResponse.json({ success: true, action: 'verify', message: tCopyright("claimVerified") });
    }

    if (action === 'reject') {
      // Update claim status to rejected
      await admin
        .from('copyright_claims')
        .update({
          status: 'rejected',
          reviewer_id: user.id,
          reviewer_note: reason || null,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', Number(claim_id));

      // Update post: remove and mark as disputed
      await admin
        .from('posts')
        .update({
          status: 'removed',
          copyright_claim_status: 'disputed',
        })
        .eq('id', claim.post_id);

      // Increment copyright_strike_count on the claimant's profile
      const { data: profile } = await admin
        .from('profiles')
        .select('copyright_strike_count')
        .eq('user_id', claim.claimant_id)
        .single();

      const newStrikeCount = (profile?.copyright_strike_count || 0) + 1;
      const strikeUpdate: Record<string, unknown> = { copyright_strike_count: newStrikeCount };
      if (newStrikeCount >= 10) {
        strikeUpdate.status = 'moderation';
        strikeUpdate.moderation_reason = tErrors("copyrightStrike", { count: newStrikeCount });
        try {
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: claim.claimant_id, decision: 'moderation', reason: tErrors("copyrightStrike", { count: newStrikeCount }), moderator_id: 'system',
          });
        } catch {}
      }
      await admin.from('profiles').update(strikeUpdate).eq('user_id', claim.claimant_id);

      // Notify the claimant
      const tNotif = await getTranslations("notifications");
      await createNotification({
        admin,
        user_id: claim.claimant_id,
        actor_id: claim.claimant_id,
        type: 'copyright_rejected',
        object_type: 'post',
        object_id: claim.post_id,
        content: reason ? tNotif("copyrightClaimRejectedWithReason", { reason }) : tNotif("copyrightClaimRejected"),
      });

      // Log moderation action
      await admin.from('moderation_logs').insert({
        moderator_id: user.id,
        action: 'copyright_reject',
        target_type: 'post',
        target_id: String(claim.post_id),
        reason: reason || tCopyright("claimRejected"),
      });

      return NextResponse.json({ success: true, action: 'reject', message: tCopyright("claimRejected") });
    }

    return NextResponse.json({ error: tErrors("invalidAction") }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
