import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("notesTitle"),
    description: t("notesDescription"),
  };
}

export default function NotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
