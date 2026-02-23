import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTextContent } from "@/lib/moderation";

/** POST — Save onboarding step data & advance progression */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { step, action, ...payload } = body;

  // Complete onboarding
  if (action === "complete") {
    // Zorunlu alanların doldurulduğunu doğrula
    const { data: prof } = await supabase
      .from("profiles")
      .select("birth_date, gender, onboarding_step")
      .eq("user_id", user.id)
      .single();

    if (!prof?.birth_date || !prof?.gender) {
      return NextResponse.json({ error: "Zorunlu alanlar eksik" }, { status: 400 });
    }
    if ((prof?.onboarding_step || 1) < 7) {
      return NextResponse.json({ error: "Onboarding adımları tamamlanmadı" }, { status: 400 });
    }

    await supabase
      .from("profiles")
      .update({ onboarding_completed: true, onboarding_step: 8 })
      .eq("user_id", user.id);
    return NextResponse.json({ completed: true });
  }

  // Step doğrulaması
  if (action !== "complete") {
    if (!step || typeof step !== "number" || step < 1 || step > 8) {
      return NextResponse.json({ error: "Geçersiz adım" }, { status: 400 });
    }
  }

  // Skip step
  if (action === "skip") {
    const skippable = [1, 4, 5, 6, 7];
    if (!skippable.includes(step)) {
      return NextResponse.json({ error: "Bu adım atlanamaz" }, { status: 400 });
    }
    const nextStep = Math.min(8, step + 1);
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .single();
    const currentProgress = profile?.onboarding_step || 1;
    // Client'ın mevcut adımdan ileri atlamamasını sağla
    if (step > currentProgress + 1) {
      return NextResponse.json({ error: "Adım sırası atlanamaz" }, { status: 400 });
    }
    if (nextStep > currentProgress) {
      await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("user_id", user.id);
    }
    return NextResponse.json({ next: nextStep });
  }

  // Save step data
  const updates: Record<string, unknown> = {};

  switch (step) {
    case 1:
      // Avatar — handled separately via /api/profile/avatar
      break;
    case 2: {
      const birth = payload.birth_date;
      if (!birth) return NextResponse.json({ error: "Doğum tarihi gerekli" }, { status: 400 });
      const d = new Date(birth);
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
      updates.birth_date = birth;
      break;
    }
    case 3: {
      const gender = payload.gender;
      if (!gender || !["male", "female", "other"].includes(gender)) {
        return NextResponse.json({ error: "Cinsiyet secimi gerekli" }, { status: 400 });
      }
      updates.gender = gender;
      break;
    }
    case 4: {
      const bio = (payload.bio || "").slice(0, 150);
      updates.bio = bio;
      break;
    }
    case 5:
      // Email verify — Supabase handles this natively
      break;
    case 6:
      // Topics — tag follows handled client-side via /api/tags/[id]/follow
      break;
    case 7:
      // Suggestions — no data to save
      break;
  }

  // Check if user is admin (immune to moderation)
  const { data: onbProfile } = await (createAdminClient()).from('profiles').select('role').eq('user_id', user.id).single();
  const isAdminUser = onbProfile?.role === 'admin';

  // Only run AI moderation when text fields are being updated (not for enums like gender)
  const TEXT_FIELDS = ['full_name', 'name', 'surname', 'username', 'bio'];
  const hasTextUpdates = Object.keys(updates).some(k => TEXT_FIELDS.includes(k));

  if (Object.keys(updates).length > 0) {
    // Synchronous AI moderation for onboarding profile fields — admin immune
    if (hasTextUpdates && !isAdminUser) try {
      const supa = await createClient();
      const { data: curr } = await supa
        .from('profiles')
        .select('name, surname, username, bio')
        .eq('user_id', user.id)
        .single();
      const text = [updates.full_name, curr?.name, curr?.surname, curr?.username, updates.bio]
        .filter(Boolean).join(' ').slice(0, 500);
      if (text && text.trim().length >= 3) {
        // Overall
        const overall = await checkTextContent('', text, { contentType: 'profile', linkCount: (String(updates.bio||'').match(/https?:\/\//g) || []).length });
        if (overall.safe === false) {
          // Multi-field threshold
          const parts = [String(updates.username||''), String(updates.bio||'')].filter(Boolean);
          let flagged = 0;
          for (const p of parts) {
            const r = await checkTextContent('', p, { contentType: 'profile', linkCount: (p.match(/https?:\/\//g) || []).length });
            if (r.safe === false) flagged++;
          }
          if (flagged >= 2) {
            updates.status = 'moderation';
            try {
              const admin2 = createAdminClient();
              const aiCode = String(Math.floor(100000 + Math.random() * 900000));
              await admin2.from('moderation_decisions').insert({
                target_type: 'user', target_id: user.id, decision: 'moderation', reason: overall.reason || 'Profil bilgileri AI tarafından işaretlendi', moderator_id: 'system', decision_code: aiCode,
              });
            } catch {}
          }
        }
      }
    } catch {}

    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Background AI check on public profile fields during onboarding only (first signup) — admin immune
  if (!isAdminUser) after(async () => {
    try {
      const admin = createAdminClient();
      const { data: p } = await admin
        .from('profiles')
        .select('user_id, name, surname, full_name, username, bio, onboarding_completed, status, role')
        .eq('user_id', user.id)
        .single();
      if (!p || p.onboarding_completed || p.role === 'admin') return;
      const text = [p.full_name, p.name, p.surname, p.username, p.bio].filter(Boolean).join(' ').slice(0, 500);
      if (text.length < 2) return;
      const res = await checkTextContent('', text);
      if (res.safe === false) {
        await admin.from('profiles').update({ status: 'moderation' }).eq('user_id', p.user_id);
        try {
          const aiCode = String(Math.floor(100000 + Math.random() * 900000));
          await admin.from('moderation_decisions').insert({
            target_type: 'user', target_id: p.user_id, decision: 'moderation', reason: res.reason || 'Onboarding profil bilgileri AI tarafından işaretlendi', moderator_id: 'system', decision_code: aiCode,
          });
        } catch {}
      }
    } catch {}
  });

  // Advance progression
  const nextStep = Math.min(8, step + 1);
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_step")
    .eq("user_id", user.id)
    .single();
  const currentProgress = profile?.onboarding_step || 1;
  // Client'ın mevcut adımdan ileri atlamamasını sağla
  if (step > currentProgress + 1) {
    return NextResponse.json({ error: "Adım sırası atlanamaz" }, { status: 400 });
  }
  if (nextStep > currentProgress) {
    await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("user_id", user.id);
  }

  return NextResponse.json({ next: nextStep });
}

/** GET — Get user suggestions for step 7 (uses same algorithm as /api/suggestions) */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Forward to suggestions API with limit=8
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/suggestions?limit=8`, {
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
  });
  const data = await res.json();

  return NextResponse.json({ suggestions: data.users || [] });
}
