import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { getInitialUserForShell } from "@/lib/initialUser";
import { getTranslations } from "next-intl/server";
import { getSidebarLabels } from "@/lib/sidebarLabels";
import { getPublicFooterLabels } from "@/lib/footerLabels";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialUser, tAuth, tCommon, sidebarLabels, footerLabels] = await Promise.all([
    getInitialUserForShell(),
    getTranslations("auth"),
    getTranslations("common"),
    getSidebarLabels(),
    getPublicFooterLabels(),
  ]);

  return (
    <DashboardShell
      initialUser={initialUser}
      headerAlertLabels={{
        emailNotVerified: tAuth("emailNotVerified"),
        clickHere: tAuth("clickHere"),
        close: tCommon("close"),
      }}
      sidebarLabels={sidebarLabels}
      footerLabels={footerLabels}
    >
      {children}
    </DashboardShell>
  );
}
