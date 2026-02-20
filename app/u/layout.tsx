import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AmbientLight from "@/components/AmbientLight";
import { UserProvider, type InitialUser } from "@/components/UserContext";
import { getAuthUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function getInitialUser(): Promise<InitialUser | null> {
  const userId = await getAuthUserId();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("username, full_name, name, surname, avatar_url, account_type, is_premium, premium_plan, is_verified, role")
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
  };
}

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getInitialUser();

  return (
    <UserProvider initialUser={initialUser}>
      <div className="min-h-screen text-text-primary">
        <AmbientLight />
        <Sidebar />
        <main className="md:ml-[240px] min-h-screen pb-20 md:pb-0">
          <div className="flex-1 min-w-0 max-w-[600px] mx-auto min-h-screen">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </UserProvider>
  );
}
