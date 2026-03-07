import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getAlternateLanguages } from "@/lib/seo";

const OG_LOCALES: Record<string, string> = { tr: "tr_TR", en: "en_US", az: "az_AZ" };

const contentMap: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  tr: () => import("./content.tr"),
  en: () => import("./content.en"),
  az: () => import("./content.az"),
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  const locale = await getLocale();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  return {
    title: t("accessRestrictions.title"),
    description: t("accessRestrictions.description"),
    openGraph: {
      title: t("accessRestrictions.title"),
      description: t("accessRestrictions.description"),
      type: "article",
      url: `${baseUrl}/help/access-restrictions`,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    alternates: {
      canonical: `${baseUrl}/help/access-restrictions`,
      languages: getAlternateLanguages("/help/access-restrictions"),
    },
  };
}

export default async function AccessRestrictionsPage() {
  const locale = await getLocale();
  const { default: Content } = await (contentMap[locale] ?? contentMap.en)();
  return <Content />;
}
