"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import PublicFooter from "@/components/PublicFooter";
import AmbientLight from "@/components/AmbientLight";
import { UserProvider, type InitialUser } from "@/components/UserContext";

interface DashboardShellContextValue {
  setMobileNavVisible: (visible: boolean) => void;
}

const DashboardShellContext = createContext<DashboardShellContextValue>({
  setMobileNavVisible: () => {},
});

export function useDashboardShell() {
  return useContext(DashboardShellContext);
}

export default function DashboardShell({
  initialUser,
  children,
}: {
  initialUser: InitialUser | null;
  children: React.ReactNode;
}) {
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const pathname = usePathname();
  const isSettingsPage = pathname.startsWith("/dashboard/settings");

  const setNav = useCallback((visible: boolean) => setMobileNavVisible(visible), []);

  return (
    <UserProvider initialUser={initialUser}>
      <DashboardShellContext.Provider value={{ setMobileNavVisible: setNav }}>
        <div id="dashboard-shell" className="min-h-screen text-text-primary">
          <AmbientLight />
          <Sidebar />
          <main className="md:ml-[240px] min-h-screen md:h-screen md:overflow-y-auto pb-20 md:pb-0">
            <div className="max-w-[1400px] mx-auto w-full">
              {children}
            </div>
          </main>
          {mobileNavVisible && <MobileBottomNav />}
        </div>
      </DashboardShellContext.Provider>
    </UserProvider>
  );
}
