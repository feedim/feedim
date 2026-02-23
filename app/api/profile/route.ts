import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTextContent } from "@/lib/moderation";
import { getUserPlan } from "@/lib/limits";
import { revalidateTag } from "next/cache";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["name", "surname", "username", "bio", "website", "birth_date", "gender", "phone_number", "account_private", "account_type", "professional_category", "contact_email", "contact_phone"];
  const updates: Record<string, any> = {};

  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }

  // Doğum tarihi doğrulaması
  if (updates.birth_date) {
    const d = new Date(updates.birth_date);
    if (isNaN(d.getTime())) {
      return NextResponse.json({ error: "Geçersiz tarih formatı" }, { status: 400 });
    }
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const monthDiff = now.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
      age--;
    }
    if (age < 13 || age > 120) {
      return NextResponse.json({ error: "Yaş 13-120 arasında olmalı" }, { status: 400 });
    }
  }

  if (updates.name || updates.surname) {
    const { data: current } = await supabase
      .from("profiles")
      .select("name, surname, name_changed_at, name_change_count")
      .eq("user_id", user.id)
      .single();

    const nameChanged = (updates.name && updates.name !== current?.name) || (updates.surname && updates.surname !== current?.surname);
    if (nameChanged && current) {
      const fourteenDays = 14 * 24 * 60 * 60 * 1000;
      const lastChange = current.name_changed_at ? new Date(current.name_changed_at).getTime() : 0;
      const withinWindow = Date.now() - lastChange < fourteenDays;
      if (withinWindow && (current.name_change_count || 0) >= 2) {
        return NextResponse.json({ error: "Ad soyad 14 gunde en fazla 2 kez degistirilebilir" }, { status: 429 });
      }
      updates.name_changed_at = new Date().toISOString();
      updates.name_change_count = withinWindow ? (current.name_change_count || 0) + 1 : 1;
    }

    const name = updates.name || current?.name || "";
    const surname = updates.surname || current?.surname || "";
    updates.full_name = [name, surname].filter(Boolean).join(" ");
  }

  if (updates.username) {
    const usernameRegex = /^(?!.*[._]{2})[A-Za-z0-9](?:[A-Za-z0-9._]{1,13})[A-Za-z0-9]$/;
    if (!usernameRegex.test(updates.username)) {
      return NextResponse.json({ error: "Geçersiz kullanıcı adı" }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", updates.username)
      .neq("user_id", user.id)
      .single();
    if (existing) {
      return NextResponse.json({ error: "Bu kullanıcı adı zaten alınmış" }, { status: 409 });
    }
    // Username change limit: 7 days
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("username, username_changed_at")
      .eq("user_id", user.id)
      .single();
    if (currentProfile && currentProfile.username !== updates.username && currentProfile.username_changed_at) {
      const lastChange = new Date(currentProfile.username_changed_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastChange < sevenDays) {
        const daysLeft = Math.ceil((sevenDays - (Date.now() - lastChange)) / (24 * 60 * 60 * 1000));
        return NextResponse.json({ error: `Kullanici adi ${daysLeft} gun sonra degistirilebilir` }, { status: 429 });
      }
    }
    if (currentProfile && currentProfile.username !== updates.username) {
      updates.username_changed_at = new Date().toISOString();
      // Save old username for redirect
      const admin = createAdminClient();
      // Update any existing redirects pointing to the old username
      await admin.from("username_redirects").update({ new_username: updates.username }).eq("new_username", currentProfile.username);
      // Insert new redirect
      await admin.from("username_redirects").insert({
        old_username: currentProfile.username,
        new_username: updates.username,
        user_id: user.id,
      });
    }
  }

  // Professional account validation
  if (updates.account_type) {
    if (updates.account_type === "personal") {
      updates.professional_category = null;
      updates.contact_email = null;
      updates.contact_phone = null;
    } else if (updates.account_type === "creator" || updates.account_type === "business") {
      updates.account_private = false;
      const admin = createAdminClient();
      const plan = await getUserPlan(admin, user.id);
      // Profesyonel hesap Pro, Max veya Business gerektirir
      if (plan !== "pro" && plan !== "max" && plan !== "business") {
        return NextResponse.json({ error: "Profesyonel hesap için Pro, Max veya Business aboneliği gereklidir" }, { status: 403 });
      }
      // Creator hesaplar iletişim bilgisi ekleyemez
      if (updates.account_type === "creator") {
        updates.contact_email = null;
        updates.contact_phone = null;
      }
      // Business account requires Business subscription
      if (updates.account_type === "business" && plan !== "business") {
        return NextResponse.json({ error: "İşletme hesabı Business abonelere özeldir" }, { status: 403 });
      }
    }
  }

  // Contact email format validation
  if (updates.contact_email && updates.contact_email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.contact_email.trim())) {
      return NextResponse.json({ error: "Geçersiz iletişim e-posta adresi" }, { status: 400 });
    }
    updates.contact_email = updates.contact_email.trim();
  }

  updates.updated_at = new Date().toISOString();

  // Auto-approve pending follow requests when disabling private account
  // Process in batches of 50 to avoid overwhelming the database
  if (updates.account_private === false) {
    const admin = createAdminClient();

    // Kick off batch approval in the background — don't block the response
    (async () => {
      const BATCH_SIZE = 50;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await admin
          .from("follow_requests")
          .select("id, requester_id")
          .eq("target_id", user.id)
          .eq("status", "pending")
          .limit(BATCH_SIZE);

        if (!batch || batch.length === 0) {
          hasMore = false;
          break;
        }

        // Create follows for this batch
        const follows = batch.map(r => ({
          follower_id: r.requester_id,
          following_id: user.id,
        }));
        await admin.from("follows").upsert(follows, { onConflict: "follower_id,following_id" });

        // Mark this batch as accepted
        const batchIds = batch.map(r => r.id);
        await admin
          .from("follow_requests")
          .update({ status: "accepted" })
          .in("id", batchIds);

        // Update following count for each requester in this batch
        for (const r of batch) {
          const { count: followingCount } = await admin
            .from("follows")
            .select("id", { count: "exact", head: true })
            .eq("follower_id", r.requester_id);
          await admin.from("profiles").update({ following_count: followingCount || 0 }).eq("user_id", r.requester_id);
        }

        // If we got fewer than BATCH_SIZE, we're done
        if (batch.length < BATCH_SIZE) {
          hasMore = false;
        }
      }

      // Recount follower count once at the end
      const { count: followerCount } = await admin
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", user.id);
      await admin.from("profiles").update({ follower_count: followerCount || 0 }).eq("user_id", user.id);
    })().catch(() => {});
  }

  // AI moderation on profile text fields (name, surname, username, bio)
  try {
    const { data: current } = await supabase
      .from("profiles")
      .select("name, surname, username, bio, profile_score, spam_score, status")
      .eq("user_id", user.id)
      .single();
    const fields = {
      name: (updates.name ?? current?.name ?? '') as string,
      surname: (updates.surname ?? current?.surname ?? '') as string,
      username: (updates.username ?? current?.username ?? '') as string,
      bio: (updates.bio ?? current?.bio ?? '') as string,
    };
    const linkCount = (fields.bio.match(/https?:\/\//g) || []).length;
    // Overall check
    const overall = await checkTextContent('', [fields.name, fields.surname, fields.username, fields.bio].filter(Boolean).join(' '), {
      contentType: 'profile',
      linkCount,
      profileScore: current?.profile_score,
      spamScore: current?.spam_score,
    });
    if (overall.safe === false) {
      // Per-field checks; require >= 2 fields flagged to set moderation
      let flaggedCount = 0;
      for (const value of [fields.username, fields.bio]) {
        if (value && value.trim().length >= 2) {
          try {
            const res = await checkTextContent('', value, { contentType: 'profile', linkCount: (value.match(/https?:\/\//g) || []).length });
            if (res.safe === false) flaggedCount++;
          } catch {}
        }
      }
      if (flaggedCount >= 2) {
        updates.status = 'moderation';
        updates.moderation_reason = overall.reason || 'Profil alanlarında ihlal tespit edildi';
      }
    } else {
      // If profile is clean and currently in moderation, restore to active
      if (current?.status === 'moderation') {
        updates.status = 'active';
        updates.moderation_reason = null;
        try {
          const admin = createAdminClient();
          await Promise.all([
            admin.from("reports").delete().eq("content_type", "user").eq("content_id", user.id),
            admin.from("moderation_decisions").delete().eq("target_type", "user").eq("target_id", String(user.id)),
            admin.from("moderation_logs").delete().eq("target_type", "user").eq("target_id", String(user.id)),
          ]);
        } catch {}
      }
    }
  } catch {}

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidateTag("profiles", { expire: 0 });
  return NextResponse.json({ profile: data });
}
