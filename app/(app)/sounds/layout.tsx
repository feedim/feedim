import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("soundsTitle"),
    description: t("soundsDescription"),
  };
}

export default function SoundsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
