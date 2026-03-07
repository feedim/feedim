import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("exploreTitle"),
    description: t("exploreDescription"),
  };
}

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
