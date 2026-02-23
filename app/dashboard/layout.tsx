import { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import DashboardShell from "@/components/DashboardShell";

import type { InitialUser } from "@/components/UserContext";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function getInitialUser(): Promise<InitialUser | null> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return null;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("username, full_name, name, surname, avatar_url, account_type, is_premium, premium_plan, is_verified, role, status, copyright_eligible")
      .eq("user_id", userId)
      .single();

    if (!profile) return null;

    return {
      id: userId,
      username: profile.username || "",
      fullName: profile.full_name || [profile.name, profile.surname].filter(Boolean).join(" ") || "",
      avatarUrl: profile.avatar_url || null,
      accountType: profile.account_type || "personal",
      isPremium: profile.is_premium === true,
      premiumPlan: profile.is_premium ? (profile.premium_plan || null) : null,
      isVerified: profile.is_verified === true,
      role: profile.role || "user",
      status: profile.status || "active",
      copyrightEligible: profile.copyright_eligible === true,
    };
  } catch {
    return null;
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialUser();

  return (
    <DashboardShell initialUser={initialUser}>
      {children}
    </DashboardShell>
  );
}
