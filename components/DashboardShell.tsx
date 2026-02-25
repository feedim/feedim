"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import PublicFooter from "@/components/PublicFooter";
import AmbientLight from "@/components/AmbientLight";
import { UserProvider, type InitialUser } from "@/components/UserContext";
import LocationPrompt from "@/components/LocationPrompt";

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
  const isSettingsPage = pathname.startsWith("/settings");

  const setNav = useCallback((visible: boolean) => setMobileNavVisible(visible), []);

  // Cross-tab auth sync + periodic account status check
  useEffect(() => {
    // 1. BroadcastChannel — listen for auth events from other tabs
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("fdm-auth");
      bc.onmessage = (event) => {
        const { type } = event.data || {};
        if (type === "SIGNED_OUT") {
          window.location.replace("/");
        }
        if (type === "SIGNED_IN") {
          window.location.reload();
        }
        if (type === "STATUS_CHANGED") {
          window.location.replace("/account-moderation");
        }
      };
    } catch {}

    // 2. Periodic account status check (Facebook-style)
    let statusInterval: ReturnType<typeof setInterval> | undefined;
    if (initialUser) {
      const checkStatus = async () => {
        if (document.hidden) return;
        try {
          const res = await fetch("/api/account/status", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data.status && data.status !== "active") {
            document.cookie = `fdm-status=${data.status}; Max-Age=60; Path=/;`;
            window.location.replace("/account-moderation");
          }
        } catch {}
      };
      statusInterval = setInterval(checkStatus, 60_000);
    }

    return () => {
      bc?.close();
      if (statusInterval) clearInterval(statusInterval);
    };
  }, [initialUser]);

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
          <LocationPrompt />
        </div>
      </DashboardShellContext.Provider>
    </UserProvider>
  );
}
