import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("momentsTitle"),
    description: t("momentsDescription"),
  };
}

export default function MomentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
