import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/socialMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  return buildPageMetadata({
    title: t("postsTitle"),
    description: t("postsDescription"),
    locale,
    path: "/posts",
  });
}

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
