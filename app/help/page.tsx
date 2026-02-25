import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import HelpContent from "./HelpContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  return {
    title: t("helpCenter.title"),
    description: t("helpCenter.description"),
  };
}

export default function HelpPage() {
  return <HelpContent />;
}
