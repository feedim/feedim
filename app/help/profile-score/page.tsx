import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { getAlternateLanguages } from "@/lib/seo";

const contentMap: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  tr: () => import("./content.tr"),
  en: () => import("./content.en"),
  az: () => import("./content.az"),
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return {
    title: t("profileScore.title"),
    description: t("profileScore.description"),
    alternates: {
      languages: getAlternateLanguages("/help/profile-score"),
    },
  };
}

export default async function ProfileScorePage() {
  const locale = await getLocale();
  const { default: Content } = await (contentMap[locale] ?? contentMap.en)();
  return <Content />;
}
