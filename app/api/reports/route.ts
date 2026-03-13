import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkNsfwContent } from "@/lib/nsfwCheck";
import { checkTextContent, evaluateUserReports, checkAutoAccountModeration } from "@/lib/moderation";
import type { ReportData } from "@/lib/moderation";
import { createNotification } from "@/lib/notifications";
import { safeError } from "@/lib/apiError";
import { reconcileSoundStatus } from "@/lib/soundLifecycle";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getTranslations } from "next-intl/server";
import { syncTagCountsForStatusChange } from "@/lib/tagCounts";

// Rate limiter — max 10 reports per 5 minutes per user
const reportMap = new Map<string, { count: number; resetAt: number }>();
function checkReportLimit(userId: string): boolean {
  const now = Date.now();
  const entry = reportMap.get(userId);
  if (!entry || now > entry.resetAt) {
    reportMap.set(userId, { count: 1, resetAt: now + 5 * 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const tErrors = await getTranslations("apiErrors");
  const tNotif = await getTranslations("notifications");

  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
  const plan = await getUserPlan(admin, user.id);
  const isAdminUser = isAdminPlan(plan);

  if (!isAdminUser && !checkReportLimit(user.id)) {
    return NextResponse.json({ error: tErrors("uploadRateLimited") }, { status: 429 });
  }

  const body = await request.json();
  const { type, target_id, reason, original_url, copy_url, copyright_description, copyright_owner_name, copyright_email } = body;
  let { description } = body;

  if (!type || !target_id || !reason) {
    return NextResponse.json({ error: tErrors("missingInfo") }, { status: 400 });
  }

  if (!["post", "user", "comment"].includes(type)) {
    return NextResponse.json({ error: tErrors("invalidReportType") }, { status: 400 });
  }

  // Sponsored content cannot be reported (platform-managed)
  if (type === 'post') {
    const { data: targetPost } = await admin.from('posts')
      .select('is_sponsored')
      .eq('id', Number(target_id)).single();
    if (targetPost?.is_sponsored) return NextResponse.json({ error: tErrors("sponsoredContentReport") }, { status: 400 });
    // Note: Boosted content CAN be reported — boost status is informational for moderators
  }

  // Copyright complaint: requires original_url and copy_url
  if (reason === 'copyright') {
    if (!original_url || !copy_url) {
      return NextResponse.json({ error: tErrors("copyrightUrlRequired") }, { status: 400 });
    }
    description = JSON.stringify({
      original_url: String(original_url).slice(0, 500),
      copy_url: String(copy_url).slice(0, 500),
      copyright_description: copyright_description ? String(copyright_description).slice(0, 500) : null,
    });
  }

  // Check for duplicate report
  let dupQuery = admin
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("content_type", type);
  if (type === 'user') {
    dupQuery = dupQuery.eq("content_author_id", String(target_id));
  } else {
    dupQuery = dupQuery.eq("content_id", Number(target_id));
  }
  const { data: existing } = await dupQuery.single();

  if (existing) {
    return NextResponse.json({ error: tErrors("alreadyReported") }, { status: 409 });
  }

  // Resolve content author for the report target
  let contentAuthorId: string | null = null;
  if (type === 'post') {
    const { data: p } = await admin.from('posts').select('author_id').eq('id', Number(target_id)).single();
    contentAuthorId = p?.author_id || null;
  } else if (type === 'comment') {
    const { data: c } = await admin.from('comments').select('author_id').eq('id', Number(target_id)).single();
    contentAuthorId = c?.author_id || null;
  } else if (type === 'user') {
    contentAuthorId = String(target_id);
  }

  // Fetch reporter's profile_score for weighted reports
  let reporterWeight = 1.0;
  try {
    const { data: reporterProfile } = await admin
      .from("profiles")
      .select("profile_score")
      .eq("user_id", user.id)
      .single();
    const ps = reporterProfile?.profile_score ?? 50;
    if (ps >= 70) reporterWeight = 1.0;
    else if (ps >= 50) reporterWeight = 0.7;
    else if (ps >= 30) reporterWeight = 0.4;
    else if (ps >= 10) reporterWeight = 0.2;
    else reporterWeight = 0.0;
  } catch {}

  const insertData: Record<string, any> = {
    reporter_id: user.id,
    content_type: type,
    content_author_id: contentAuthorId,
    reason,
    description: description?.trim().slice(0, 500) || null,
    status: "pending",
    reporter_weight: reporterWeight,
  };
  // Only set content_id for post/comment reports — user reports reference via content_author_id
  if (type !== 'user') {
    insertData.content_id = Number(target_id);
  }

  const { error } = await admin.from("reports").insert(insertData);

  if (error) {
    return safeError(error);
  }

  // Create copyright_claims entry for copyright reports
  if (reason === 'copyright' && type === 'post') {
    try {
      await admin.from('copyright_claims').insert({
        post_id: Number(target_id),
        claimant_id: user.id,
        status: 'pending',
        claim_type: 'dispute',
        owner_name: copyright_owner_name ? String(copyright_owner_name).slice(0, 200) : '',
        owner_email: copyright_email ? String(copyright_email).slice(0, 200) : '',
        proof_description: copyright_description ? String(copyright_description).slice(0, 500) : '',
        proof_urls: [original_url && String(original_url).slice(0, 500), copy_url && String(copy_url).slice(0, 500)].filter(Boolean),
        content_type: 'post',
      });
    } catch {}
  }

  // Weighted complaint algorithm: SUM(reporter_weight) instead of COUNT
  let weightQuery = admin
    .from("reports")
    .select("reporter_weight")
    .eq("content_type", type)
    .eq("status", "pending");
  if (type === 'user') {
    weightQuery = weightQuery.eq("content_author_id", String(target_id));
  } else {
    weightQuery = weightQuery.eq("content_id", Number(target_id));
  }
  const { data: weightData } = await weightQuery;

  const weightedTotal = (weightData || []).reduce((sum: number, r: any) => sum + (r.reporter_weight || 1.0), 0);
  const reportCount = (weightData || []).length;

  // Unique trusted reporters check — prevents spam report abuse
  const trustedReporterCount = (weightData || []).filter((r: any) => r.reporter_weight >= 0.4).length;
  const MIN_TRUSTED_REPORTERS = type === 'user' ? 10 : 3;
  const MIN_PRIORITY_REPORTERS = type === 'user' ? 20 : 5;

  // Check if the target belongs to an admin or moderator (immune to moderation)
  let targetIsAdmin = false;
  if (type === 'post') {
    const { data: postAuthor } = await admin.from('posts').select('author_id').eq('id', Number(target_id)).single();
    if (postAuthor) {
      const { data: ap } = await admin.from('profiles').select('role').eq('user_id', postAuthor.author_id).single();
      if (ap?.role === 'admin' || ap?.role === 'moderator') targetIsAdmin = true;
    }
  } else if (type === 'comment') {
    const { data: comAuthor } = await admin.from('comments').select('author_id').eq('id', Number(target_id)).single();
    if (comAuthor?.author_id) {
      const { data: ap } = await admin.from('profiles').select('role').eq('user_id', comAuthor.author_id).single();
      if (ap?.role === 'admin' || ap?.role === 'moderator') targetIsAdmin = true;
    }
  } else if (type === 'user') {
    const { data: ap } = await admin.from('profiles').select('role').eq('user_id', target_id).single();
    if (ap?.role === 'admin' || ap?.role === 'moderator') targetIsAdmin = true;
  }

  // Check if this content was previously approved by a moderator — skip re-flagging
  let isApprovedByModerator = false;
  if ((type === 'post' || type === 'comment') && !targetIsAdmin) {
    try {
      const { data: approvalRecord } = await admin
        .from('moderation_decisions')
        .select('id')
        .eq('target_type', type)
        .eq('target_id', String(target_id))
        .eq('decision', 'approved')
        .order('created_at', { ascending: false })
        .limit(1);
      isApprovedByModerator = !!(approvalRecord && approvalRecord.length > 0);
    } catch {}
  }

  // Weighted >= 3.0 + enough trusted reporters → AI report evaluation (background)
  // Admin immune, approved immune, requires minimum trusted reporters to prevent spam abuse
  if (weightedTotal >= 3.0 && weightedTotal < 10.0 && trustedReporterCount >= MIN_TRUSTED_REPORTERS && !targetIsAdmin && !isApprovedByModerator) {
    after(async () => {
      try {
        const admin2 = createAdminClient();

        // Fetch all reports for this content (reason + description + weight)
        let allReportsQuery = admin2
          .from('reports')
          .select('reason, description, reporter_weight')
          .eq('content_type', type)
          .eq('status', 'pending');
        if (type === 'user') {
          allReportsQuery = allReportsQuery.eq('content_author_id', String(target_id));
        } else {
          allReportsQuery = allReportsQuery.eq('content_id', Number(target_id));
        }
        const { data: allReports } = await allReportsQuery;
        const reports: ReportData[] = (allReports || []).map((r: any) => ({
          reason: r.reason,
          description: r.description,
          weight: r.reporter_weight || 1.0,
        }));

        if (type === "post") {
          // Skip auto-flagging if post has active boosts
          const { count: postBoostCount } = await admin2.from('post_boosts')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', Number(target_id))
            .in('status', ['active', 'pending_review', 'paused']);
          if (postBoostCount && postBoostCount > 0) return; // Boosted post — skip moderation

          const { data: postData } = await admin2
            .from("posts")
            .select("id, title, content")
            .eq("id", Number(target_id))
            .single();
          if (postData) {
            const contentText = [postData.title || '', (postData.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()].filter(Boolean).join('\n');

            // Run NSFW image check + AI report evaluation in parallel
            const [imgRes, aiResult] = await Promise.all([
              checkNsfwContent(postData.content || ""),
              evaluateUserReports(contentText, 'post', reports, reportCount),
            ]);

            const nsfwFlagged = imgRes.action !== 'allow';
            const shouldModerate = aiResult.shouldModerate || nsfwFlagged;

            if (shouldModerate) {
              await admin2.from("posts").update({
                is_nsfw: true,
                moderation_due_at: new Date().toISOString(),
                moderation_reason: aiResult.reason,
                moderation_category: aiResult.severity ? `report_${aiResult.severity}` : (nsfwFlagged ? 'nsfw_image' : null),
              }).eq("id", postData.id);
              // Reconcile sound after flagging
              const { data: flaggedPostSound } = await admin2.from('posts').select('sound_id').eq('id', postData.id).single();
              if (flaggedPostSound?.sound_id) {
                try { await reconcileSoundStatus(admin2, flaggedPostSound.sound_id as number); } catch {}
              }
            }

            // Log AI decision
            try {
              await admin2.from('moderation_decisions').insert({
                target_type: 'post',
                target_id: String(target_id),
                decision: shouldModerate ? 'flagged' : 'reports_reviewed',
                reason: aiResult.reason,
                moderator_id: 'system',
              });
            } catch {}

            // 10dk içinde 5+ flag → hesabı moderasyona al
            if (shouldModerate && contentAuthorId) {
              try { await checkAutoAccountModeration(admin2, contentAuthorId); } catch {}
            }

            // Notify reporters
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'post')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await createNotification({
                admin: admin2,
                user_id: rep.reporter_id,
                actor_id: rep.reporter_id,
                type: 'system',
                object_type: 'post',
                object_id: Number(target_id),
                content: shouldModerate ? tNotif('reportContentUnderReview') : tNotif('reportContentReviewedByAi'),
              });
            }
          }
        } else if (type === "comment") {
          const { data: c } = await admin2
            .from("comments")
            .select("id, content")
            .eq("id", Number(target_id))
            .single();
          if (c) {
            const contentText = (c.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const aiResult = await evaluateUserReports(contentText, 'comment', reports, reportCount);

            if (aiResult.shouldModerate) {
              await admin2.from('comments').update({
                is_nsfw: true,
                moderation_reason: aiResult.reason,
              }).eq('id', c.id);
              // Recalculate post comment_count to exclude NSFW
              const { data: pc } = await admin2.from('comments').select('post_id').eq('id', c.id).single();
              if (pc?.post_id) {
                const { count } = await admin2
                  .from('comments')
                  .select('id', { count: 'exact', head: true })
                  .eq('post_id', pc.post_id)
                  .eq('status', 'approved')
                  .eq('is_nsfw', false);
                await admin2.from('posts').update({ comment_count: count || 0 }).eq('id', pc.post_id);
              }
            }

            // Log AI decision
            try {
              await admin2.from('moderation_decisions').insert({
                target_type: 'comment',
                target_id: String(target_id),
                decision: aiResult.shouldModerate ? 'flagged' : 'reports_reviewed',
                reason: aiResult.reason,
                moderator_id: 'system',
              });
            } catch {}

            // Notify reporters
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await createNotification({
                admin: admin2,
                user_id: rep.reporter_id,
                actor_id: rep.reporter_id,
                type: 'system',
                object_type: 'comment',
                object_id: Number(target_id),
                content: aiResult.shouldModerate ? tNotif('reportContentUnderReview') : tNotif('reportContentReviewedByAi'),
              });
            }
          }
        } else if (type === "user") {
          // Profile reports (boosted users are NOT immune from moderation)
          const { data: profile } = await admin2
            .from('profiles')
            .select('full_name, username, bio, website')
            .eq('user_id', target_id)
            .single();
          if (profile) {
            const contentText = [profile.full_name, profile.username, profile.bio, profile.website].filter(Boolean).join('\n');
            const aiResult = await evaluateUserReports(contentText, 'profile', reports, reportCount);

            if (aiResult.shouldModerate) {
              await admin2.from('profiles').update({ status: 'moderation', moderation_reason: aiResult.reason || tNotif('communityComplaintReview') }).eq('user_id', target_id);
            }

            try {
              await admin2.from('moderation_decisions').insert({
                target_type: 'user',
                target_id: String(target_id),
                decision: aiResult.shouldModerate ? 'flagged' : 'reports_reviewed',
                reason: aiResult.reason,
                moderator_id: 'system',
              });
            } catch {}

            // Notify reporters
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'user')
              .eq('content_author_id', target_id);
            for (const rep of reps || []) {
              await createNotification({
                admin: admin2,
                user_id: rep.reporter_id,
                actor_id: rep.reporter_id,
                type: 'system',
                object_type: 'user',
                object_id: 0,
                content: aiResult.shouldModerate ? tNotif('reportProfileUnderReview') : tNotif('reportProfileReviewedByAi'),
              });
            }
          }
        }
      } catch {}
    });
  }

  // Weighted >= 10.0 + enough trusted reporters → priority moderation queue + AI reason
  // Admin immune, approved immune, requires MIN_PRIORITY_REPORTERS trusted reporters
  // Note: Boosted content is NOT immune — boost status shown to moderators for context
  if (weightedTotal >= 10.0 && trustedReporterCount >= MIN_PRIORITY_REPORTERS && !targetIsAdmin && !isApprovedByModerator) {
    const genericReason = tNotif('multipleCommunityComplaints');

    if (type === "post") {
      // Auto-flag immediately
      const { data: modPost } = await admin
        .from('posts')
        .select('status, sound_id')
        .eq('id', Number(target_id))
        .single();
      await admin.from('posts').update({ status: 'moderation', is_nsfw: true, moderation_due_at: new Date().toISOString() }).eq('id', Number(target_id));
      await syncTagCountsForStatusChange(admin, Number(target_id), modPost?.status, 'moderation');
      // Reconcile sound after post enters moderation
      if (modPost?.sound_id) {
        const _sid = modPost.sound_id as number;
        after(async () => { try { await reconcileSoundStatus(createAdminClient(), _sid); } catch {} });
      }

      // Insert decision with generic reason (AI will update in background)
      let decisionId: string | null = null;
      try {
        const ins = await admin.from("moderation_decisions")
          .insert({
            target_type: "post",
            target_id: String(target_id),
            decision: "flagged",
            reason: genericReason,
            moderator_id: "system",
          })
          .select("id").single();
        decisionId = ins.data?.id || null;
      } catch {}

      // Notify reporters
      const { data: postReps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'post')
        .eq('content_id', Number(target_id));
      for (const rep of (postReps || [])) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'system', object_type: 'post', object_id: Number(target_id), content: tNotif('reportContentPriorityReview') });
      }

      // Background: generate AI reason and update decision + auto account moderation
      after(async () => {
        try {
          const admin2 = createAdminClient();
          const { data: postData } = await admin2.from('posts').select('title, content').eq('id', Number(target_id)).single();
          const { data: allReports } = await admin2.from('reports').select('reason, description, reporter_weight').eq('content_type', 'post').eq('content_id', Number(target_id)).eq('status', 'pending');
          if (postData && allReports) {
            const contentText = [postData.title || '', (postData.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()].filter(Boolean).join('\n');
            const reports: ReportData[] = allReports.map((r: any) => ({ reason: r.reason, description: r.description, weight: r.reporter_weight || 1.0 }));
            const aiResult = await evaluateUserReports(contentText, 'post', reports, reportCount);
            // Update moderation reason with AI-generated summary
            await admin2.from('posts').update({ moderation_reason: aiResult.reason }).eq('id', Number(target_id));
            if (decisionId) {
              await admin2.from('moderation_decisions').update({ reason: aiResult.reason }).eq('id', decisionId);
            }
          }
          // 10dk içinde 5+ flag → hesabı moderasyona al
          if (contentAuthorId) {
            await checkAutoAccountModeration(admin2, contentAuthorId);
          }
        } catch {}
      });

    } else if (type === "comment") {
      await admin.from('comments').update({ is_nsfw: true }).eq('id', Number(target_id));

      let commentDecisionId: string | null = null;
      try {
        const ins = await admin.from('moderation_decisions').insert({
          target_type: 'comment', target_id: String(target_id), decision: 'flagged', reason: genericReason, moderator_id: 'system',
        }).select('id').single();
        commentDecisionId = ins.data?.id || null;
      } catch {}

      const { data: reps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'comment')
        .eq('content_id', Number(target_id));
      for (const rep of reps || []) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'system', object_type: 'comment', object_id: Number(target_id), content: tNotif('reportContentPriorityReview') });
      }

      // Background: AI reason
      after(async () => {
        try {
          const admin2 = createAdminClient();
          const { data: c } = await admin2.from('comments').select('content').eq('id', Number(target_id)).single();
          const { data: allReports } = await admin2.from('reports').select('reason, description, reporter_weight').eq('content_type', 'comment').eq('content_id', Number(target_id)).eq('status', 'pending');
          if (c && allReports) {
            const contentText = (c.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const reports: ReportData[] = allReports.map((r: any) => ({ reason: r.reason, description: r.description, weight: r.reporter_weight || 1.0 }));
            const aiResult = await evaluateUserReports(contentText, 'comment', reports, reportCount);
            await admin2.from('comments').update({ moderation_reason: aiResult.reason }).eq('id', Number(target_id));
            if (commentDecisionId) {
              await admin2.from('moderation_decisions').update({ reason: aiResult.reason }).eq('id', commentDecisionId);
            }
          }
        } catch {}
      });

    } else if (type === "user") {
      await admin.from("profiles").update({ status: "moderation", moderation_reason: tNotif('multipleCommunityComplaints') }).eq("user_id", target_id);

      let userDecisionId: string | null = null;
      try {
        const ins = await admin.from('moderation_decisions').insert({
          target_type: 'user', target_id: String(target_id), decision: 'moderation', reason: genericReason, moderator_id: 'system',
        }).select('id').single();
        userDecisionId = ins.data?.id || null;
      } catch {}

      // Notify reporters
      const { data: userReps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'user')
        .eq('content_author_id', target_id);
      for (const rep of (userReps || [])) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'system', object_type: 'user', object_id: 0, content: tNotif('reportProfilePriorityReview') });
      }

      // Background: AI reason
      after(async () => {
        try {
          const admin2 = createAdminClient();
          const { data: profile } = await admin2.from('profiles').select('full_name, username, bio, website').eq('user_id', target_id).single();
          const { data: allReports } = await admin2.from('reports').select('reason, description, reporter_weight').eq('content_type', 'user').eq('content_author_id', target_id).eq('status', 'pending');
          if (profile && allReports) {
            const contentText = [profile.full_name, profile.username, profile.bio, profile.website].filter(Boolean).join('\n');
            const reports: ReportData[] = allReports.map((r: any) => ({ reason: r.reason, description: r.description, weight: r.reporter_weight || 1.0 }));
            const aiResult = await evaluateUserReports(contentText, 'profile', reports, reportCount);
            if (userDecisionId) {
              await admin2.from('moderation_decisions').update({ reason: aiResult.reason }).eq('id', userDecisionId);
            }
          }
        } catch {}
      });
    }
  }

  return NextResponse.json({ success: true });
}
