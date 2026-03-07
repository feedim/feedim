import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";
import { formatCount } from "@/lib/utils";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const t = await getTranslations("explore");
  const locale = await getLocale();

  const { data: tag } = await admin
    .from("tags")
    .select("name, slug, post_count")
    .eq("slug", slug)
    .single();

  if (!tag) return { title: `#${slug} | Feedim` };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  const path = `/explore/tag/${encodeURIComponent(tag.slug)}`;
  const title = `#${tag.name} | Feedim`;
  const description = t("tagDescription", { tag: tag.name, count: formatCount(tag.post_count || 0, locale) });

  return {
    title,
    description,
    openGraph: {
      title: `#${tag.name}`,
      description,
      type: "website",
      url: `${baseUrl}${path}`,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: "summary",
      title: `#${tag.name}`,
      description,
    },
    alternates: {
      canonical: `${baseUrl}${path}`,
      languages: getAlternateLanguages(path),
    },
  };
}

export default function TagLayout({ children }: Props) {
  return children;
}
