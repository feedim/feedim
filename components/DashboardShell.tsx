"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AmbientLight from "@/components/AmbientLight";
import { UserProvider } from "@/components/UserContext";
import LocationPrompt from "@/components/LocationPrompt";
import HeaderAlertBar from "@/components/HeaderAlertBar";
import type { SidebarLabels } from "@/lib/sidebarLabels";
import type { PublicFooterLabels } from "@/lib/footerLabels";
import type { InitialUser } from "@/lib/userTypes";

interface HeaderAlertBarLabels {
  emailNotVerified: string;
  clickHere: string;
  close: string;
}

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
  headerAlertLabels,
  sidebarLabels,
  footerLabels,
  children,
}: {
  initialUser: InitialUser | null;
  headerAlertLabels: HeaderAlertBarLabels;
  sidebarLabels: SidebarLabels;
  footerLabels: PublicFooterLabels;
  children: React.ReactNode;
}) {
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const pathname = usePathname();
  void pathname;

  const setNav = useCallback((visible: boolean) => setMobileNavVisible(visible), []);

  // Cross-tab auth sync + periodic account status check + global 403 interceptor
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
    let visibilityHandler: (() => void) | undefined;
    if (initialUser) {
      const checkStatus = async () => {
        if (document.hidden) return;
        try {
          const res = await fetch("/api/account/status", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          if (data.status && data.status !== "active") {
            document.cookie = `fdm-status=${data.status}; Max-Age=10; Path=/;`;
            window.location.replace("/account-moderation");
          }
        } catch {}
      };
      statusInterval = setInterval(checkStatus, 60_000);
      visibilityHandler = () => {
        if (!document.hidden) void checkStatus();
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    // 3. Global fetch interceptor — redirect on 403 "account not active"
    const originalFetch = window.fetch;
    let redirecting = false;
    window.fetch = async (...args) => {
      let res: Response;
      try {
        res = await originalFetch(...args);
      } catch (err) {
        throw err;
      }
      if (res.status === 403 && !redirecting) {
        try {
          const cloned = res.clone();
          const data = await cloned.json();
          if (data.status && data.status !== "active" && data.error) {
            redirecting = true;
            window.location.replace("/account-moderation");
          }
        } catch {}
      }
      return res;
    };

    // Delegated click handler for [data-mention-link] — replaces inline onclick
    const mentionHandler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("[data-mention-link]");
      if (target) e.stopPropagation();
    };
    document.addEventListener("click", mentionHandler, true);

    return () => {
      bc?.close();
      if (statusInterval) clearInterval(statusInterval);
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
      window.fetch = originalFetch;
      document.removeEventListener("click", mentionHandler, true);
    };
  }, [initialUser]);

  return (
    <UserProvider initialUser={initialUser}>
      <DashboardShellContext.Provider value={{ setMobileNavVisible: setNav }}>
        <div id="dashboard-shell" className="min-h-screen text-text-primary">
          <HeaderAlertBar labels={headerAlertLabels} />
          <AmbientLight />
          <Sidebar labels={sidebarLabels} footerLabels={footerLabels} />
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
