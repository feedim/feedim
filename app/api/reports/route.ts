import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTextContent, checkImageContent } from "@/lib/moderation";
import { createNotification } from "@/lib/notifications";

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
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  // Check if the target belongs to an admin (immune to moderation)
  let targetIsAdmin = false;
  if (type === 'post') {
    const { data: postAuthor } = await admin.from('posts').select('author_id').eq('id', Number(target_id)).single();
    if (postAuthor) {
      const { data: ap } = await admin.from('profiles').select('role').eq('user_id', postAuthor.author_id).single();
      if (ap?.role === 'admin') targetIsAdmin = true;
    }
  } else if (type === 'comment') {
    const { data: comAuthor } = await admin.from('comments').select('author_id').eq('id', Number(target_id)).single();
    if (comAuthor?.author_id) {
      const { data: ap } = await admin.from('profiles').select('role').eq('user_id', comAuthor.author_id).single();
      if (ap?.role === 'admin') targetIsAdmin = true;
    }
  } else if (type === 'user') {
    const { data: ap } = await admin.from('profiles').select('role').eq('user_id', target_id).single();
    if (ap?.role === 'admin') targetIsAdmin = true;
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

  // Weighted >= 3.0 → AI deep scan (background); reports stay until admin resolves — admin immune
  if (weightedTotal >= 3.0 && weightedTotal < 10.0 && !targetIsAdmin && !isApprovedByModerator) {
    after(async () => {
      try {
        const admin2 = createAdminClient();
        if (type === "post") {
          const { data: postData } = await admin2
            .from("posts")
            .select("id, title, content")
            .eq("id", Number(target_id))
            .single();
          if (postData) {
            const [imgRes, txtRes] = await Promise.all([
              checkImageContent(postData.content || ""),
              checkTextContent(postData.title || "", postData.content || ""),
            ]);
            const shouldNSFW = (imgRes.action !== 'allow') || (txtRes.safe === false);
            const modUpdates: Record<string, unknown> = shouldNSFW
              ? {
                  is_nsfw: true,
                  moderation_due_at: new Date().toISOString(),
                  moderation_reason: txtRes.reason || imgRes.reason || 'Topluluk şikayeti sonrası AI tarama',
                  moderation_category: txtRes.category || (imgRes.action !== 'allow' ? (imgRes.reason || 'nsfw_image') : null),
                }
              : { is_nsfw: false, moderation_due_at: null };
            await admin2.from("posts").update(modUpdates).eq("id", postData.id);
            // Notify reporters — reports stay until admin resolves
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
                content: shouldNSFW ? 'Şikayet ettiğiniz içerik inceleme altına alındı.' : 'Şikayet edilen içerik AI tarafından incelendi.'
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
            const t = await checkTextContent('', c.content || '');
            const flagged = t.safe === false;
            if (flagged) {
              await admin2.from('comments').update({
                is_nsfw: true,
                moderation_reason: t.reason || 'Topluluk şikayeti sonrası AI tarama',
                moderation_category: t.category || null,
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
            // Notify reporters — reports stay until admin resolves
            const { data: reps } = await admin2
              .from('reports')
              .select('reporter_id')
              .eq('content_type', 'comment')
              .eq('content_id', Number(target_id));
            for (const rep of reps || []) {
              await admin2.from('notifications').insert({ user_id: rep.reporter_id, actor_id: rep.reporter_id, type: 'system', object_type: 'comment', object_id: Number(target_id), content: flagged ? 'Şikayet ettiğiniz içerik inceleme altına alındı.' : 'Şikayet edilen içerik AI tarafından incelendi.' });
            }
          }
        }
      } catch {}
    });
  }

  // Weighted >= 10.0 → priority moderation queue; reports stay until admin resolves — admin immune, approved immune
  if (weightedTotal >= 10.0 && !targetIsAdmin && !isApprovedByModerator) {
    if (type === "post") {
      // Generate 6-digit decision code; store in decision_code if possible, else embed into reason
      let decisionCode = String(Math.floor(100000 + Math.random() * 900000));
      let autoDecision: any = null;
      const { data: postOwner } = await admin
        .from('posts')
        .select('author_id, title, slug')
        .eq('id', Number(target_id))
        .single();
      try {
        const ins = await admin.from("moderation_decisions")
          .insert({
            target_type: "post",
            target_id: String(target_id),
            decision: "removed",
            reason: "Çok sayıda topluluk şikayeti",
            moderator_id: "system",
            decision_code: decisionCode,
          })
          .select("id, decision_code").single();
        autoDecision = ins.data;
      } catch (_) {
        const ins2 = await admin.from("moderation_decisions")
          .insert({
            target_type: "post",
            target_id: String(target_id),
            decision: "removed",
            reason: `Çok sayıda topluluk şikayeti (Ref:#${decisionCode})`,
            moderator_id: "system",
          })
          .select("id").single();
        autoDecision = ins2.data;
      }

      // Stricter review: set to moderation (no auto removal)
      await admin.from('posts').update({ status: 'moderation', is_nsfw: true, moderation_due_at: new Date().toISOString() }).eq('id', Number(target_id));
      // Notify reporters — reports stay until admin resolves
      const { data: postReps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'post')
        .eq('content_id', Number(target_id));
      for (const rep of (postReps || [])) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: 'system' as any, type: 'system', object_type: 'post', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerik öncelikli incelemeye alındı.' });
      }
    } else if (type === "comment") {
      // Stricter review: mark NSFW (no auto removal)
      await admin.from('comments').update({ is_nsfw: true }).eq('id', Number(target_id));
      try {
        const comRepCode = String(Math.floor(100000 + Math.random() * 900000));
        await admin.from('moderation_decisions').insert({
          target_type: 'comment', target_id: String(target_id), decision: 'flagged', reason: 'Çok sayıda topluluk şikayeti', moderator_id: 'system', decision_code: comRepCode,
        });
      } catch {}
      const { data: reps } = await admin
        .from('reports')
        .select('reporter_id')
        .eq('content_type', 'comment')
        .eq('content_id', Number(target_id));
      for (const rep of reps || []) {
        await createNotification({ admin, user_id: rep.reporter_id, actor_id: 'system' as any, type: 'system', object_type: 'comment', object_id: Number(target_id), content: 'Şikayet ettiğiniz içerik öncelikli incelemeye alındı.' });
      }
    } else if (type === "user") {
      await admin.from("profiles").update({ status: "moderation" }).eq("user_id", target_id);
      try {
        const userRepCode = String(Math.floor(100000 + Math.random() * 900000));
        await admin.from('moderation_decisions').insert({
          target_type: 'user', target_id: String(target_id), decision: 'moderation', reason: 'Çok sayıda topluluk şikayeti', moderator_id: 'system', decision_code: userRepCode,
        });
      } catch {}
    }
  }

  return NextResponse.json({ success: true });
}
