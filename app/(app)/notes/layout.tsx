import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { buildPageMetadata } from "@/lib/socialMetadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const locale = await getLocale();
  return buildPageMetadata({
    title: t("notesTitle"),
    description: t("notesDescription"),
    locale,
    path: "/notes",
  });
}

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
