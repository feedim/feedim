import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("onboardingTitle"),
    robots: { index: false, follow: false },
  };
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
