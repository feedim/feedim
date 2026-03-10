import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/socialMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  return buildPageMetadata({
    title: t("videoTitle"),
    description: t("videoDescription"),
    locale,
    path: "/video",
  });
}

export default function VideoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
