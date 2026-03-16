import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { getInitialUserForDashboard } from "@/lib/initialUser";
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
  const [{ user: initialUser, needsOnboarding }, tAuth, tCommon, tNotif, sidebarLabels, footerLabels] = await Promise.all([
    getInitialUserForDashboard(),
    getTranslations("auth"),
    getTranslations("common"),
    getTranslations("notifications"),
    getSidebarLabels(),
    getPublicFooterLabels(),
  ]);

  if (needsOnboarding) {
    redirect("/onboarding");
  }

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
      deviceLoginLabel={tNotif("deviceLogin")}
    >
      {children}
    </DashboardShell>
  );
}
