import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("authTitle"),
    description: t("authDescription"),
    robots: { index: false, follow: false },
  };
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
