import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AmbientLight from "@/components/AmbientLight";
import { UserProvider } from "@/components/UserContext";
import { getInitialUserForShell } from "@/lib/initialUser";

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getInitialUserForShell();

  return (
    <UserProvider initialUser={initialUser}>
      <div className="min-h-screen text-text-primary">
        <AmbientLight />
        <Sidebar />
        <main className="md:ml-[240px] min-h-screen pb-20 md:pb-0">
          <div className="flex-1 min-w-0 max-w-[565px] mx-auto min-h-screen">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </UserProvider>
  );
}
