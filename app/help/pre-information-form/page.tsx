import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

const contentMap: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  tr: () => import("./content.tr"),
  en: () => import("./content.en"),
  az: () => import("./content.az"),
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return {
    title: t("preInformation.title"),
    description: t("preInformation.description"),
  };
}

export default async function PreInformationFormPage() {
  const locale = await getLocale();
  const { default: Content } = await (contentMap[locale] ?? contentMap.en)();
  return <Content />;
}
