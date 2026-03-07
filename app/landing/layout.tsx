import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: t("title"),
      description: t("ogDescription"),
      type: "website",
      url: `${baseUrl}/landing`,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("ogDescription"),
    },
    alternates: {
      canonical: `${baseUrl}/landing`,
      languages: getAlternateLanguages("/landing"),
    },
  };
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
