"use client";

import { createContext, useContext, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { feedimAlert } from "@/components/FeedimAlert";
import type { User } from "@supabase/supabase-js";

/* ─── Types ─── */

interface AuthModalContextValue {
  requireAuth: (returnPath?: string) => Promise<User | null>;
}

/* ─── Context ─── */

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

/* ─── Provider ─── */

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createClient();

  const requireAuth = useCallback(async (rp?: string): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Redirect to login with next URL
      const returnTo = rp || pathname || "/";
      window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
      return null;
    }

    return user;
  }, [supabase, pathname]);

  return (
    <AuthModalContext.Provider value={{ requireAuth }}>
      {children}
    </AuthModalContext.Provider>
  );
}
