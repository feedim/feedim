import Sidebar from "@/components/Sidebar";
import ColumnHeader from "@/components/ColumnHeader";
import SuggestionWidget from "@/components/SuggestionWidget";
import AmbientLight from "@/components/AmbientLight";
import MobileBottomNav from "@/components/MobileBottomNav";
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

export default async function PostLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getInitialUser();

  return (
    <UserProvider initialUser={initialUser}>
      <div id="post-shell" className="min-h-screen text-text-primary">
        <AmbientLight />
        <Sidebar />
        <main className="md:ml-[240px] min-h-screen pb-16 md:pb-0">
          <div className="flex">
            <div className="flex-1 min-w-0 max-w-[650px] mx-auto min-h-screen">
              <ColumnHeader />
              {children}
            </div>
            <aside className="hidden xl:block w-[350px] shrink-0">
              <div className="fixed top-0 w-[350px] h-screen p-4 pt-6 space-y-3 overflow-y-auto overscroll-contain scrollbar-hide">
                <div id="right-sidebar-top" />
                <div id="right-sidebar-suggestions">
                  <SuggestionWidget />
                </div>
              </div>
            </aside>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </UserProvider>
  );
}
