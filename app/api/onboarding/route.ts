import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTextContent } from "@/lib/moderation";
import { getTranslations } from "next-intl/server";
import { safeError } from "@/lib/apiError";
import { INTEREST_CATEGORIES } from "@/lib/constants";

/** POST — Save onboarding step data & advance progression */
export async function POST(req: NextRequest) {
  const tErrors = await getTranslations("errors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

  const t = await getTranslations("onboarding");
  const admin = createAdminClient();

  const body = await req.json();
  const { step, action, ...payload } = body;

  // Complete onboarding
  if (action === "complete") {
    // Zorunlu alanların doldurulduğunu doğrula
    const { data: prof } = await admin
      .from("profiles")
      .select("birth_date, gender, country, language, onboarding_step, onboarding_completed")
      .eq("user_id", user.id)
      .single();

    // Zaten tamamlanmışsa tekrar işlem yapma (idempotent)
    if ((prof as any)?.onboarding_completed) {
      const res = NextResponse.json({ completed: true });
      res.cookies.set('fdm-onboarding', '1', {
        maxAge: 86400 * 30, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      });
      return res;
    }

    if (!prof?.birth_date || !prof?.gender || !prof?.country || !prof?.language) {
      return NextResponse.json({ error: t("requiredFieldsMissing") }, { status: 400 });
    }
    if ((prof?.onboarding_step || 1) < 9) {
      return NextResponse.json({ error: t("stepsNotCompleted") }, { status: 400 });
    }

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
        const tApiErrors = await getTranslations("apiErrors");

        // 1. AI text check on profile fields (profillerde sadece ağır küfür flag'lenir)
        const text = [p.full_name, p.name, p.surname, p.username, p.bio].filter(Boolean).join(' ').slice(0, 500);
        if (text.length >= 2) {
          const textResult = await checkTextContent('', text, { contentType: 'profile' });
          if (textResult.safe === false) {
            shouldModerate = true;
            moderationReason = textResult.reason || tApiErrors("profileFlaggedByAutoCheck");
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
            moderationReason = tApiErrors("avatarInappropriateContent");
          }
        }

        if (shouldModerate) {
          await adminBg.from('profiles').update({ status: 'moderation', moderation_reason: moderationReason }).eq('user_id', p.user_id);
          try {
            await adminBg.from('moderation_decisions').insert({
              target_type: 'user', target_id: p.user_id, decision: 'moderation', reason: moderationReason, moderator_id: 'system',
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
    const skippable = [3, 6, 7, 9];
    if (!skippable.includes(step)) {
      return NextResponse.json({ error: t("cannotSkip") }, { status: 400 });
    }
    const nextStep = Math.min(10, step + 1);
    const { data: profile } = await admin
      .from("profiles")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .single();
    const currentProgress = profile?.onboarding_step || 1;
    if (nextStep > currentProgress) {
      await admin.from("profiles").update({ onboarding_step: nextStep }).eq("user_id", user.id);
    }
    return NextResponse.json({ next: nextStep });
  }

  // Save step data
  // Not: Sıra kontrolü kaldırıldı — "complete" aksiyonu zorunlu alanları doğrular.
  // Client-server senkronizasyon sorunlarında (ör. mobil offline geçiş) gereksiz hata veriyordu.
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
      if (age < 15 || age > 120) {
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
      const bio = (payload.bio || "").replace(/<[^>]*>/g, "").slice(0, 150);
      updates.bio = bio;
      break;
    }
    case 7:
      // Email verify — Supabase handles this natively
      break;
    case 8: {
      // İlgi alanları
      const interestIds = payload.interest_ids;
      if (!Array.isArray(interestIds) || interestIds.length < 3 || interestIds.length > 8) {
        return NextResponse.json({ error: t("invalidInterests") }, { status: 400 });
      }
      const allowedIds = new Set<number>(INTEREST_CATEGORIES.map(c => c.id));
      const validIds = interestIds.filter((id: unknown) => typeof id === 'number' && allowedIds.has(id as number));
      if (validIds.length < 3) {
        return NextResponse.json({ error: t("invalidInterests") }, { status: 400 });
      }
      const admin = createAdminClient();
      await admin.from('user_interests').delete().eq('user_id', user.id).eq('source', 'onboarding');
      await admin.from('user_interests').insert(
        validIds.map((id: number) => ({ user_id: user.id, interest_id: id, source: 'onboarding', score: 50.0 }))
      );
      break;
    }
    case 9:
      // Suggestions — no data to save
      break;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await admin.from("profiles").update(updates).eq("user_id", user.id);
    if (error) return safeError(error);
  }

  // Advance progression
  const nextStep = Math.min(10, step + 1);
  const { data: progressProfile } = await admin
    .from("profiles")
    .select("onboarding_step")
    .eq("user_id", user.id)
    .single();
  const currentProgress = progressProfile?.onboarding_step || 1;
  if (nextStep > currentProgress) {
    await admin.from("profiles").update({ onboarding_step: nextStep }).eq("user_id", user.id);
  }

  return NextResponse.json({ next: nextStep });
}

/** GET — Get user suggestions for step 7 (uses same algorithm as /api/suggestions) */
export async function GET(req: NextRequest) {
  const tErrors = await getTranslations("errors");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

  // Forward to suggestions API with limit=8
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/suggestions?limit=8`, {
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
  });
  const data = await res.json();

  // Filter out current user (internal fetch may fall to guest mode where self isn't excluded)
  const suggestions = (data.users || []).filter((u: any) => u.user_id !== user.id);

  return NextResponse.json({ suggestions });
}
