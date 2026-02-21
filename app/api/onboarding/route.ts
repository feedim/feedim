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
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true, onboarding_step: 8 })
      .eq("user_id", user.id);
    return NextResponse.json({ completed: true });
  }

  // Skip step
  if (action === "skip") {
    const skippable = [1, 4, 5, 6, 7];
    if (!skippable.includes(step)) {
      return NextResponse.json({ error: "Bu adim atlanamaz" }, { status: 400 });
    }
    const nextStep = Math.min(8, step + 1);
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_step")
      .eq("user_id", user.id)
      .single();
    const currentProgress = profile?.onboarding_step || 1;
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
      if (!birth) return NextResponse.json({ error: "Dogum tarihi gerekli" }, { status: 400 });
      const d = new Date(birth);
      const now = new Date();
      const age = now.getFullYear() - d.getFullYear();
      if (isNaN(d.getTime()) || age < 13 || age > 120) {
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

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("profiles").update(updates).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Background AI check on public profile fields during onboarding only (first signup)
  after(async () => {
    try {
      const admin = createAdminClient();
      const { data: p } = await admin
        .from('profiles')
        .select('user_id, name, surname, full_name, username, bio, onboarding_completed, status')
        .eq('user_id', user.id)
        .single();
      if (!p || p.onboarding_completed) return;
      const text = [p.full_name, p.name, p.surname, p.username, p.bio].filter(Boolean).join(' ').slice(0, 500);
      if (text.length < 2) return;
      const res = await checkTextContent('', text);
      if (res.severity === 'block' || res.severity === 'flag') {
        await admin.from('profiles').update({ status: 'moderation' }).eq('user_id', p.user_id);
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
  if (nextStep > currentProgress) {
    await supabase.from("profiles").update({ onboarding_step: nextStep }).eq("user_id", user.id);
  }

  return NextResponse.json({ next: nextStep });
}

/** GET — Get user suggestions for step 6 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Get users the current user is NOT following
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const followingIds = (following || []).map((f) => f.following_id).filter(id => uuidRegex.test(id));
  followingIds.push(user.id); // exclude self

  const { data: suggestions } = await supabase
    .from("profiles")
    .select("user_id, name, surname, full_name, username, avatar_url, bio, is_verified, premium_plan")
    .not("user_id", "in", `(${followingIds.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(8);

  return NextResponse.json({ suggestions: suggestions || [] });
}
