import Sidebar from "@/components/Sidebar";
import ColumnHeader from "@/components/ColumnHeader";
import SuggestionWidget from "@/components/SuggestionWidget";
import AmbientLight from "@/components/AmbientLight";
import MobileBottomNav from "@/components/MobileBottomNav";
import { UserProvider } from "@/components/UserContext";
import { getInitialUserForShell } from "@/lib/initialUser";
import { getSidebarLabels } from "@/lib/sidebarLabels";
import { getPublicFooterLabels } from "@/lib/footerLabels";

export default async function PostLayout({ children }: { children: React.ReactNode }) {
  const [initialUser, sidebarLabels, footerLabels] = await Promise.all([
    getInitialUserForShell(),
    getSidebarLabels(),
    getPublicFooterLabels(),
  ]);

  return (
    <UserProvider initialUser={initialUser}>
      <div id="post-shell" className="min-h-screen text-text-primary">
        <AmbientLight />
        <Sidebar labels={sidebarLabels} footerLabels={footerLabels} />
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
