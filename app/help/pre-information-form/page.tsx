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
    title: t("preInformation.title"),
    description: t("preInformation.description"),
    openGraph: {
      title: t("preInformation.title"),
      description: t("preInformation.description"),
      type: "article",
      url: `${baseUrl}/help/pre-information-form`,
      siteName: "Feedim",
      locale: OG_LOCALES[locale] || "en_US",
    },
    alternates: {
      canonical: `${baseUrl}/help/pre-information-form`,
      languages: getAlternateLanguages("/help/pre-information-form"),
    },
  };
}

export default async function PreInformationFormPage() {
  const locale = await getLocale();
  const { default: Content } = await (contentMap[locale] ?? contentMap.en)();
  return <Content />;
}
