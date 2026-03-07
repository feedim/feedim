"use client";

import { useSidebarCollapsed } from "@/lib/sidebar-state";

export default function ProfileShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarCollapsed();

  return (
    <main className={`${collapsed ? "md:ml-[72px]" : "md:ml-[240px]"} min-h-screen pb-20 md:pb-0 transition-[margin] duration-200`}>
      {children}
    </main>
  );
}
