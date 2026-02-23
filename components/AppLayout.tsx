"use client";

import { useEffect } from "react";
import ColumnHeader from "@/components/ColumnHeader";
import SuggestionWidget from "@/components/SuggestionWidget";
import { useDashboardShell } from "@/components/DashboardShell";

interface AppLayoutProps {
  children: React.ReactNode;
  rightSidebar?: React.ReactNode;
  hideColumnHeader?: boolean;
  hideMobileNav?: boolean;
  hideRightSidebar?: boolean;
  headerRightAction?: React.ReactNode;
  headerOnBack?: () => void;
  headerTitle?: string;
  scrollableHeader?: boolean;
}

export default function AppLayout({
  children,
  rightSidebar,
  hideColumnHeader,
  hideMobileNav,
  hideRightSidebar,
  headerRightAction,
  headerOnBack,
  headerTitle,
  scrollableHeader,
}: AppLayoutProps) {
  const { setMobileNavVisible } = useDashboardShell();

  // Tell the persistent shell whether to show mobile nav
  useEffect(() => {
    if (hideMobileNav) {
      setMobileNavVisible(false);
      return () => setMobileNavVisible(true);
    }
  }, [hideMobileNav, setMobileNavVisible]);

  return (
    <div className="flex">
      <div className="flex-1 min-w-0 max-w-[565px] mx-auto min-h-screen">
        {!hideColumnHeader && (
          <ColumnHeader
            rightAction={headerRightAction}
            onBack={headerOnBack}
            customTitle={headerTitle}
            scrollable={scrollableHeader}
          />
        )}
        {children}
      </div>
      {!hideRightSidebar && (
        <aside className="hidden xl:block w-[350px] shrink-0">
          <div className="fixed top-0 w-[350px] h-screen p-4 pt-6 space-y-3 overflow-y-auto overscroll-contain scrollbar-hide z-10">
            {rightSidebar || <SuggestionWidget />}
          </div>
        </aside>
      )}
    </div>
  );
}
