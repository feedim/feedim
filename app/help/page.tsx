import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAlternateLanguages } from "@/lib/seo";
import HelpContent from "./HelpContent";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://feedim.com";
  return {
    title: t("helpCenter.title"),
    description: t("helpCenter.description"),
    alternates: {
      canonical: `${baseUrl}/help`,
      languages: getAlternateLanguages("/help"),
    },
  };
}

export default function HelpPage() {
  return <HelpContent />;
}
