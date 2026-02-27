import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTextContent } from "@/lib/moderation";
import { getTranslations } from "next-intl/server";
import { safeError } from "@/lib/apiError";

/** POST — Save onboarding step data & advance progression */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const t = await getTranslations("onboarding");
  const tErrors = await getTranslations("errors");

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
      return NextResponse.json({ error: t("requiredFieldsMissing") }, { status: 400 });
    }
    if ((prof?.onboarding_step || 1) < 9) {
      return NextResponse.json({ error: t("stepsNotCompleted") }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: completeErr } = await admin
      .from("profiles")
      .update({ onboarding_completed: true, onboarding_step: 10 })
      .eq("user_id", user.id);
    if (completeErr) return safeError(completeErr);

    // Background: full AI check after onboarding completion
    after(async () => {
      try {
        const adminBg = createAdminClient();
        const { data: p } = await adminBg
          .from('profiles')
          .select('user_id, name, surname, full_name, username, bio, role')
          .eq('user_id', user.id)
          .single();
        if (!p || p.role === 'admin') return;

        let shouldModerate = false;
        let moderationReason = '';

        // 1. AI text check on profile fields
        const text = [p.full_name, p.name, p.surname, p.username, p.bio].filter(Boolean).join(' ').slice(0, 500);
        if (text.length >= 2) {
          const textResult = await checkTextContent('', text);
          if (textResult.safe === false) {
            shouldModerate = true;
            moderationReason = textResult.reason || 'Profil bilgileri otomatik kontrol tarafından işaretlendi';
          }
        }

        // 2. Check if avatar was NSFW-flagged during onboarding
        if (!shouldModerate) {
          const { data: nsfwEvents } = await adminBg
            .from('security_events')
            .select('id')
            .eq('user_id', user.id)
            .eq('event_type', 'avatar_nsfw_flagged')
            .limit(1);
          if (nsfwEvents && nsfwEvents.length > 0) {
            shouldModerate = true;
            moderationReason = 'Profil fotoğrafında uygunsuz içerik tespit edildi';
          }
        }

        if (shouldModerate) {
          await adminBg.from('profiles').update({ status: 'moderation', moderation_reason: moderationReason }).eq('user_id', p.user_id);
          try {
            const aiCode = String(Math.floor(100000 + Math.random() * 900000));
            await adminBg.from('moderation_decisions').insert({
              target_type: 'user', target_id: p.user_id, decision: 'moderation', reason: moderationReason, moderator_id: 'system', decision_code: aiCode,
            });
          } catch {}
        }
      } catch {}
    });

    // Set onboarding cookie so middleware skips DB check
    const res = NextResponse.json({ completed: true });
    res.cookies.set('fdm-onboarding', '1', {
      maxAge: 86400 * 30, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    });
    return res;
  }

  // Step doğrulaması
  if (action !== "complete") {
    if (!step || typeof step !== "number" || step < 1 || step > 10) {
      return NextResponse.json({ error: t("invalidStep") }, { status: 400 });
    }
  }

  // Skip step
  if (action === "skip") {
    const skippable = [3, 6, 7, 8, 9];
    if (!skippable.includes(step)) {
      return NextResponse.json({ error: t("cannotSkip") }, { status: 400 });
    }
    const nextStep = Math.min(10, step + 1);
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .single();
    const currentProgress = profile?.onboarding_step || 1;
    // Client'ın mevcut adımdan ileri atlamamasını sağla
    if (step > currentProgress + 1) {
      return NextResponse.json({ error: t("cannotSkipOrder") }, { status: 400 });
    }
    if (nextStep > currentProgress) {
      await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("user_id", user.id);
    }
    return NextResponse.json({ next: nextStep });
  }

  // Save step data
  const updates: Record<string, unknown> = {};

  switch (step) {
    case 1: {
      // Country — required
      const country = payload.country;
      if (!country || typeof country !== "string" || country.length !== 2) {
        return NextResponse.json({ error: t("countryRequired") }, { status: 400 });
      }
      updates.country = country.toUpperCase();
      break;
    }
    case 2: {
      // Language — required
      const lang = payload.language;
      if (!lang || !["tr", "en", "az"].includes(lang)) {
        return NextResponse.json({ error: t("languageRequired") }, { status: 400 });
      }
      updates.language = lang;
      break;
    }
    case 3:
      // Avatar — handled separately via /api/profile/avatar
      break;
    case 4: {
      const birth = payload.birth_date;
      if (!birth) return NextResponse.json({ error: t("birthDateRequired") }, { status: 400 });
      const d = new Date(birth);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: t("invalidDateFormat") }, { status: 400 });
      }
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const monthDiff = now.getMonth() - d.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
        age--;
      }
      if (age < 13 || age > 120) {
        return NextResponse.json({ error: t("ageRange") }, { status: 400 });
      }
      updates.birth_date = birth;
      break;
    }
    case 5: {
      const gender = payload.gender;
      if (!gender || !["male", "female"].includes(gender)) {
        return NextResponse.json({ error: t("genderRequired") }, { status: 400 });
      }
      updates.gender = gender;
      break;
    }
    case 6: {
      const bio = (payload.bio || "").slice(0, 150);
      updates.bio = bio;
      break;
    }
    case 7:
      // Email verify — Supabase handles this natively
      break;
    case 8:
      // Topics — tag follows handled client-side via /api/tags/[id]/follow
      break;
    case 9:
      // Suggestions — no data to save
      break;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) return safeError(error);
  }

  // Advance progression
  const nextStep = Math.min(10, step + 1);
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_step")
    .eq("user_id", user.id)
    .single();
  const currentProgress = profile?.onboarding_step || 1;
  // Client'ın mevcut adımdan ileri atlamamasını sağla
  if (step > currentProgress + 1) {
    return NextResponse.json({ error: t("cannotSkipOrder") }, { status: 400 });
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
