import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations, getLocale } from "next-intl/server";
import { decodeId, encodeId } from "@/lib/hashId";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId } = await params;
  const t = await getTranslations("sounds");
  const numericId = decodeId(rawId);
  if (numericId === null) return { title: t("notFound") };
  const admin = createAdminClient();
  const locale = await getLocale();

  const { data: sound } = await admin
    .from("sounds")
    .select("id, title, artist, usage_count, cover_image_url")
    .eq("id", numericId)
    .eq("status", "active")
    .single();

  if (!sound) return { title: t("notFound") };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const encodedId = encodeId(sound.id);
  const path = `/sounds/${encodedId}`;
  const title = `${sound.title}${sound.artist ? ` - ${sound.artist}` : ""} | Feedim`;
  const description = t("soundDescription", { title: sound.title, count: sound.usage_count || 0 });

  return {
    title,
    description,
    openGraph: {
      title: sound.title,
      description,
      type: "music.song",
      url: `${baseUrl}${path}`,
      images: sound.cover_image_url ? [{ url: sound.cover_image_url, width: 400, height: 400 }] : undefined,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: "summary",
      title: sound.title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}${path}`,
    },
  };
}

export default function SoundLayout({ children }: Props) {
  return children;
}
