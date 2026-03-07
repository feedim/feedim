import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("videoTitle"),
    description: t("videoDescription"),
  };
}

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
