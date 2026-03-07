import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { getInitialUserForDashboard } from "@/lib/initialUser";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user: initialUser, needsOnboarding } = await getInitialUserForDashboard();

  if (needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <DashboardShell initialUser={initialUser}>
      {children}
    </DashboardShell>
  );
}
