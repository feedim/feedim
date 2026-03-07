import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMetadataContent } from "@/lib/moderation";
import { checkNsfwUrl } from "@/lib/nsfwCheck";
import { safeError } from "@/lib/apiError";
import { checkEmailVerified } from "@/lib/emailGate";
import { getTranslations } from "next-intl/server";
import { getUserPlan, isAdminPlan } from "@/lib/limits";
import { getViewerAffinity } from "@/lib/viewerAffinity";

type SoundListItem = {
  id: number;
  title: string;
  artist: string | null;
  audio_url: string;
  duration: number | null;
  usage_count: number | null;
  cover_image_url: string | null;
  is_original: boolean | null;
  created_at: string | null;
  country: string | null;
};

function stripSoundCountry(sound: SoundListItem & { _boost?: number }) {
  const { country, _boost, ...rest } = sound;
  void country;
  void _boost;
  return rest;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const sort = searchParams.get("sort") || "popular";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const cursor = searchParams.get("cursor");

    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const viewerAffinity = await getViewerAffinity(req, admin, user?.id);

    const soundSelect =
      "id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, created_at, country";

    if (sort === "popular" && !cursor && !q.trim() && viewerAffinity.country) {
      const [countrySoundsRes, globalSoundsRes] = await Promise.all([
        admin
          .from("sounds")
          .select(soundSelect)
          .eq("status", "active")
          .eq("country", viewerAffinity.country)
          .order("trending_score", { ascending: false })
          .order("usage_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(limit + 6),
        admin
          .from("sounds")
          .select(soundSelect)
          .eq("status", "active")
          .order("trending_score", { ascending: false })
          .order("usage_count", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(limit + 12),
      ]);

      if (countrySoundsRes.error) return safeError(countrySoundsRes.error);
      if (globalSoundsRes.error) return safeError(globalSoundsRes.error);

      const merged = new Map<number, SoundListItem>();
      for (const sound of [...(countrySoundsRes.data || []), ...(globalSoundsRes.data || [])]) {
        if (!merged.has(sound.id)) merged.set(sound.id, sound);
      }

      const items = Array.from(merged.values())
        .slice(0, limit)
        .map(stripSoundCountry);

      return NextResponse.json({
        sounds: items,
        hasMore: merged.size > limit,
      });
    }

    let query = admin
      .from("sounds")
      .select(soundSelect)
      .eq("status", "active")
      .limit(limit + 1);

    if (q.trim()) {
      // Sanitize for PostgREST filter syntax: escape special chars that could manipulate the query
      const sanitized = q.replace(/[,.()"'\\;:@<>{}[\]|`~!#$^&*+=?/%]/g, '').slice(0, 100);
      if (sanitized.trim()) {
        query = query.or(`title.ilike.%${sanitized}%,artist.ilike.%${sanitized}%`);
      }
    }

    if (sort === "popular") {
      query = query.order("trending_score", { ascending: false }).order("usage_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    if (cursor) {
      if (sort === "popular") {
        const { data: cursorSound } = await admin
          .from("sounds")
          .select("trending_score, usage_count, created_at")
          .eq("id", cursor)
          .single();
        if (cursorSound) {
          const ts = cursorSound.trending_score || 0;
          const uc = cursorSound.usage_count || 0;
          query = query.or(
            `trending_score.lt.${ts},and(trending_score.eq.${ts},usage_count.lt.${uc}),and(trending_score.eq.${ts},usage_count.eq.${uc},created_at.lt.${cursorSound.created_at})`
          );
        }
      } else {
        const { data: cursorSound } = await admin
          .from("sounds")
          .select("created_at")
          .eq("id", cursor)
          .single();
        if (cursorSound) {
          query = query.lt("created_at", cursorSound.created_at);
        }
      }
    }

    const { data: sounds, error } = await query;
    if (error) return safeError(error);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let items: any[] = (sounds || []).slice(0, limit);

    // Geo-aware: boost same-country sounds for search/newest pages too
    if (viewerAffinity.country && items.length > 1) {
      items = items
        .map((sound) => ({
          ...sound,
          _boost: sound.country === viewerAffinity.country ? 1 : 0,
        }))
        .sort((a, b) => b._boost - a._boost)
        .map(stripSoundCountry);
    } else {
      items = items.map(stripSoundCountry);
    }

    return NextResponse.json({
      sounds: items,
      hasMore: (sounds || []).length > limit,
    });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });
    const admin = createAdminClient();
    const plan = await getUserPlan(admin, user.id);
    const isAdminUser = isAdminPlan(plan);

    // Email verification check
    const emailCheck = await checkEmailVerified(admin, user.id, "sound");
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: 403 });
    }

    const { title, audio_url, duration, audio_hash, cover_image_url, artist } = await req.json();

    if (!title || !audio_url) {
      return NextResponse.json({ error: tErrors("soundTitleRequired") }, { status: 400 });
    }

    // Dedup by audio_hash
    if (audio_hash) {
      const { data: existing } = await admin
        .from("sounds")
        .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, status")
        .eq("audio_hash", audio_hash)
        .single();

      if (existing) {
        return NextResponse.json({ sound: existing, deduplicated: true });
      }
    }

    // Sound title moderation
    if (!isAdminUser) {
      const soundModResult = await checkMetadataContent({ soundTitle: title.trim() });
      if (!soundModResult.safe) {
        return NextResponse.json({ error: tErrors("soundTitleInappropriate") }, { status: 400 });
      }
    }

    // Cover image NSFW check
    if (!isAdminUser && cover_image_url && typeof cover_image_url === 'string') {
      try {
        const nsfwResult = await checkNsfwUrl(cover_image_url, 'standard');
        if (nsfwResult && nsfwResult.action === 'flag') {
          return NextResponse.json({ error: tErrors("coverInappropriateContent") }, { status: 400 });
        }
      } catch {}
    }

    // Get creator's country for geo-aware recommendations
    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("country")
      .eq("user_id", user.id)
      .single();

    const { data: sound, error } = await admin
      .from("sounds")
      .insert({
        title: title.trim(),
        artist: artist?.trim() || null,
        audio_url,
        duration: duration || null,
        audio_hash: audio_hash || null,
        cover_image_url: cover_image_url || null,
        created_by: user.id,
        usage_count: 0,
        country: creatorProfile?.country || null,
      })
      .select("id, title, artist, audio_url, duration, usage_count, cover_image_url, is_original, status")
      .single();

    if (error) return safeError(error);

    return NextResponse.json({ sound, deduplicated: false }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
