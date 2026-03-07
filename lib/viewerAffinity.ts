import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cached } from "@/lib/cache";

const SUPPORTED_LOCALES = new Set(["tr", "az", "en"]);

function normalizeLocale(value: string | null | undefined): string {
  if (!value) return "";
  const locale = value.trim().split("-")[0].toLowerCase();
  return SUPPORTED_LOCALES.has(locale) ? locale : "";
}

function parseAcceptLanguage(header: string | null): string {
  if (!header) return "";
  const langs = header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return {
        lang: normalizeLocale(lang),
        q: q ? parseFloat(q) : 1,
      };
    })
    .filter((item) => item.lang)
    .sort((a, b) => b.q - a.q);

  return langs[0]?.lang || "";
}

function getRequestLocale(req: NextRequest): string {
  return (
    normalizeLocale(req.cookies.get("fdm-locale")?.value) ||
    normalizeLocale(req.headers.get("x-locale")) ||
    parseAcceptLanguage(req.headers.get("accept-language"))
  );
}

function getRequestCountry(req: NextRequest): string {
  return (
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    ""
  ).toUpperCase();
}

export interface ViewerAffinity {
  language: string;
  country: string;
}

export async function getViewerAffinity(
  req: NextRequest,
  admin: SupabaseClient,
  userId?: string
): Promise<ViewerAffinity> {
  let language = getRequestLocale(req);
  let country = getRequestCountry(req);

  if (!userId) {
    return { language, country };
  }

  const profile = await cached(`user:${userId}:viewer-affinity:profile`, 300, async () => {
    const { data } = await admin
      .from("profiles")
      .select("language, country")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      language: normalizeLocale(data?.language),
      country: (data?.country || "").toUpperCase(),
    };
  });

  if (profile.language) language = profile.language;
  if (profile.country) country = profile.country;

  if (!country) {
    const location = await cached(`user:${userId}:viewer-affinity:location`, 300, async () => {
      const { data } = await admin
        .from("user_locations")
        .select("country_code")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.country_code || "").toUpperCase();
    });
    if (location) country = location;
  }

  return { language, country };
}
