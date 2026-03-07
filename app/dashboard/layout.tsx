import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { getInitialUserForShell } from "@/lib/initialUser";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialUserForShell();

  return (
    <DashboardShell initialUser={initialUser}>
      {children}
    </DashboardShell>
  );
}
