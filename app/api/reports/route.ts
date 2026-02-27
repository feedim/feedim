import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkNsfwContent } from "@/lib/nsfwCheck";
import { checkTextContent, evaluateUserReports } from "@/lib/moderation";
import type { ReportData } from "@/lib/moderation";
import { createNotification } from "@/lib/notifications";
import { safeError } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, target_id, reason, original_url, copy_url, copyright_description, copyright_owner_name, copyright_email } = body;
  let { description } = body;

  if (!type || !target_id || !reason) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  if (!["post", "user", "comment"].includes(type)) {
    return NextResponse.json({ error: "Geçersiz şikayet türü" }, { status: 400 });
  }

  // Copyright complaint: requires original_url and copy_url
  if (reason === 'copyright') {
    if (!original_url || !copy_url) {
      return NextResponse.json({ error: "Telif şikayeti için orijinal ve kopya URL gerekli" }, { status: 400 });
    }
    description = JSON.stringify({
      original_url: String(original_url).slice(0, 500),
      copy_url: String(copy_url).slice(0, 500),
      copyright_description: copyright_description ? String(copyright_description).slice(0, 500) : null,
    });
  }

  // Check for duplicate report
  const { data: existing } = await admin
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("content_type", type)
    .eq("content_id", Number(target_id))
    .single();

  if (existing) {
    return NextResponse.json({ error: "Bu içeriği zaten şikayet ettiniz" }, { status: 409 });
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

  const { error } = await admin
    .from("reports")
    .insert({
      reporter_id: user.id,
      content_type: type,
      content_id: Number(target_id),
      reason,
      description: description?.trim().slice(0, 500) || null,
      status: "pending",
      reporter_weight: reporterWeight,
    });

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
        proof_description: description || copyright_description || '',
        proof_urls: original_url ? [String(original_url).slice(0, 500)] : [],
        content_type: 'post',
      });
    } catch {}
  }

  // Weighted complaint algorithm: SUM(reporter_weight) instead of COUNT
  const { data: weightData } = await admin
    .from("reports")
    .select("reporter_weight")
    .eq("content_type", type)
    .eq("content_id", Number(target_id))
    .eq("status", "pending");

  const weightedTotal = (weightData || []).reduce((sum: number, r: any) => sum + (r.reporter_weight || 1.0), 0);
  const reportCount = (weightData || []).length;

  // Unique trusted reporters check — prevents spam report abuse
  const trustedReporterCount = (weightData || []).filter((r: any) => r.reporter_weight >= 0.4).length;
  const MIN_TRUSTED_REPORTERS = 3;
  const MIN_PRIORITY_REPORTERS = 5;

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
        const { data: allReports } = await admin2
          .from('reports')
          .select('reason, description, reporter_weight')
          .eq('content_type', type)
          .eq('content_id', Number(target_id))
          .eq('status', 'pending');
        const reports: ReportData[] = (allReports || []).map((r: any) => ({
          reason: r.reason,
          description: r.description,
          weight: r.reporter_weight || 1.0,
        }));

        if (type === "post") {
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
            }

            // Log AI decision
            const postDecisionCode = String(Math.floor(100000 + Math.random() * 900000));
            try {
              await admin2.from('moderation_decisions').insert({
                target_type: 'post',
                target_id: String(target_id),
                decision: shouldModerate ? 'flagged' : 'reports_reviewed',
                reason: aiResult.reason,
                moderator_id: 'system',
                decision_code: postDecisionCode,
              });
            } catch {}

            // Notify reporters
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'post')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await admin2.from('notifications').insert({
                user_id: rep.reporter_id,
                actor_id: rep.reporter_id,
                type: 'system',
                object_type: 'post',
                object_id: Number(target_id),
                content: shouldModerate ? 'Şikayet ettiğiniz içerik inceleme altına alındı.' : 'Şikayet edilen içerik AI tarafından incelendi.',
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
            const commentDecCode = String(Math.floor(100000 + Math.random() * 900000));
            try {
              await admin2.from('moderation_decisions').insert({
                target_type: 'comment',
                target_id: String(target_id),
                decision: aiResult.shouldModerate ? 'flagged' : 'reports_reviewed',
                reason: aiResult.reason,
                moderator_id: 'system',
                decision_code: commentDecCode,
              });
            } catch {}

            // Notify reporters
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await admin2.from('notifications').insert({
                user_id: rep.reporter_id,
                actor_id: rep.reporter_id,
                type: 'system',
                object_type: 'comment',
                object_id: Number(target_id),
                content: aiResult.shouldModerate ? 'Şikayet ettiğiniz içerik inceleme altına alındı.' : 'Şikayet edilen içerik AI tarafından incelendi.',
              });
            }
          }
        } else if (type === "user") {
          // Profile reports
          const { data: profile } = await admin2
            .from('profiles')
            .select('full_name, username, bio, website')
            .eq('user_id', target_id)
            .single();
          if (profile) {
            const contentText = [profile.full_name, profile.username, profile.bio, profile.website].filter(Boolean).join('\n');
            const aiResult = await evaluateUserReports(contentText, 'profile', reports, reportCount);

            if (aiResult.shouldModerate) {
              await admin2.from('profiles').update({ status: 'moderation', moderation_reason: aiResult.reason || 'Topluluk şikayeti üzerine inceleme' }).eq('user_id', target_id);
            }

            const userDecCode = String(Math.floor(100000 + Math.random() * 900000));
            try {
              await admin2.from('moderation_decisions').insert({
                target_type: 'user',
                target_id: String(target_id),
                decision: aiResult.shouldModerate ? 'flagged' : 'reports_reviewed',
                reason: aiResult.reason,
                moderator_id: 'system',
                decision_code: userDecCode,
              });
            } catch {}

            // Notify reporters
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'user')
              .eq('content_id', target_id);
            for (const rep of reps || []) {
              await admin2.from('notifications').insert({
                user_id: rep.reporter_id,
                actor_id: rep.reporter_id,
                type: 'system',
                object_type: 'user',
                object_id: 0,
                content: aiResult.shouldModerate ? 'Şikayet ettiğiniz profil inceleme altına alındı.' : 'Şikayet edilen profil AI tarafından incelendi.',
              });
            }
          }
        }
      } catch {}
    });
  }

  // Weighted >= 10.0 + enough trusted reporters → priority moderation queue + AI reason
  // Admin immune, approved immune, requires MIN_PRIORITY_REPORTERS trusted reporters
  if (weightedTotal >= 10.0 && trustedReporterCount >= MIN_PRIORITY_REPORTERS && !targetIsAdmin && !isApprovedByModerator) {
    const decisionCode = String(Math.floor(100000 + Math.random() * 900000));
    const genericReason = 'Çok sayıda topluluk şikayeti';

    if (type === "post") {
      // Auto-flag immediately
      await admin.from('posts').update({ status: 'moderation', is_nsfw: true, moderation_due_at: new Date().toISOString() }).eq('id', Number(target_id));

      // Insert decision with generic reason (AI will update in background)
      let decisionId: string | null = null;
      try {
        const ins = await admin.from("moderation_decisions")
          .insert({
            target_type: "post",
            target_id: String(target_id),
            decision: "removed",
            reason: genericReason,
            moderator_id: "system",
            decision_code: decisionCode,
          })
          .select("id").single();
        decisionId = ins.data?.id || null;
      } catch {
        try {
          const ins2 = await admin.from("moderation_decisions")
            .insert({
              target_type: "post",
              target_id: String(target_id),
              decision: "removed",
              reason: `${genericReason} (Ref:#${decisionCode})`,
              moderator_id: "system",
            })
            .select("id").single();
          decisionId = ins2.data?.id || null;
        } catch {}
      }

      // Notify reporters
      const { data: postReps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'post')
        .eq('content_id', Number(target_id));
      for (const rep of (postReps || [])) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: 'system' as any, type: 'system', object_type: 'post', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerik öncelikli incelemeye alındı.' });
      }

      // Background: generate AI reason and update decision
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
        } catch {}
      });

    } else if (type === "comment") {
      await admin.from('comments').update({ is_nsfw: true }).eq('id', Number(target_id));

      let commentDecisionId: string | null = null;
      try {
        const ins = await admin.from('moderation_decisions').insert({
          target_type: 'comment', target_id: String(target_id), decision: 'flagged', reason: genericReason, moderator_id: 'system', decision_code: decisionCode,
        }).select('id').single();
        commentDecisionId = ins.data?.id || null;
      } catch {}

      const { data: reps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'comment')
        .eq('content_id', Number(target_id));
      for (const rep of reps || []) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: 'system' as any, type: 'system', object_type: 'comment', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerik öncelikli incelemeye alındı.' });
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
      await admin.from("profiles").update({ status: "moderation", moderation_reason: 'Çok sayıda topluluk şikayeti' }).eq("user_id", target_id);

      let userDecisionId: string | null = null;
      try {
        const ins = await admin.from('moderation_decisions').insert({
          target_type: 'user', target_id: String(target_id), decision: 'moderation', reason: genericReason, moderator_id: 'system', decision_code: decisionCode,
        }).select('id').single();
        userDecisionId = ins.data?.id || null;
      } catch {}

      // Notify reporters
      const { data: userReps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'user')
        .eq('content_id', target_id);
      for (const rep of (userReps || [])) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: 'system' as any, type: 'system', object_type: 'user', object_id: 0, content: 'Şikayet ettiğiniz profil öncelikli incelemeye alındı.' });
      }

      // Background: AI reason
      after(async () => {
        try {
          const admin2 = createAdminClient();
          const { data: profile } = await admin2.from('profiles').select('full_name, username, bio, website').eq('user_id', target_id).single();
          const { data: allReports } = await admin2.from('reports').select('reason, description, reporter_weight').eq('content_type', 'user').eq('content_id', target_id).eq('status', 'pending');
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
