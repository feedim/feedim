import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, target_id, reason, description } = await request.json();

  if (!type || !target_id || !reason) {
    return NextResponse.json({ error: "Eksik bilgi" }, { status: 400 });
  }

  if (!["post", "user", "comment"].includes(type)) {
    return NextResponse.json({ error: "Geçersiz şikayet türü" }, { status: 400 });
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

  const { error } = await admin
    .from("reports")
    .insert({
      reporter_id: user.id,
      content_type: type,
      content_id: Number(target_id),
      reason,
      description: description?.trim().slice(0, 500) || null,
      status: "pending",
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Complaint algorithm: count distinct pending reports for this content
  const { count: reportCount } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("content_type", type)
    .eq("content_id", Number(target_id))
    .eq("status", "pending");

  // 3+ reports → auto NSFW flag
  if (reportCount && reportCount >= 3) {
    if (type === "post") {
      await admin.from("posts").update({
        is_nsfw: true,
        moderation_due_at: new Date().toISOString(),
      }).eq("id", Number(target_id)).eq("is_nsfw", false);
    } else if (type === "comment") {
      await admin.from("comments").update({ is_nsfw: true }).eq("id", Number(target_id));
    }
  }

  // 5+ reports → auto removal
  if (reportCount && reportCount >= 5) {
    if (type === "post") {
      const { data: autoDecision } = await admin.from("moderation_decisions")
        .insert({
          target_type: "post",
          target_id: String(target_id),
          decision: "removed",
          reason: "Çok sayıda topluluk şikayeti",
          moderator_id: "system",
        })
        .select("id").single();

      await admin.from("posts").update({
        status: "removed",
        is_nsfw: false,
        removed_at: new Date().toISOString(),
        removal_reason: "Topluluk şikayetleri",
        removal_decision_id: autoDecision?.id || null,
      }).eq("id", Number(target_id));
    } else if (type === "comment") {
      await admin.from("comments").update({ status: "rejected" }).eq("id", Number(target_id));
    } else if (type === "user") {
      await admin.from("profiles").update({ status: "moderation" }).eq("user_id", target_id);
    }
  }

  return NextResponse.json({ success: true });
}
