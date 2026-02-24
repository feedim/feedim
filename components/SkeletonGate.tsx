"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const nonIndexablePrefixes = ["/notifications", "/bookmarks", "/analytics", "/coins", "/settings", "/profile", "/security", "/moderation", "/admin", "/app-payment", "/subscription-payment", "/transactions", "/withdrawal", "/suggestions", "/create", "/login", "/register", "/onboarding", "/account-moderation", "/help", "/leaving", "/embed", "/payment", "/premium", "/auth"];

function isIndexablePath(pathname: string) {
  if (pathname === "/") return true;
  if (pathname.startsWith("/u/")) return true;
  if (pathname.startsWith("/explore")) return true;
  if (pathname.startsWith("/moments")) return true;
  if (pathname.startsWith("/video")) return true;
  if (pathname.startsWith("/notes")) return true;
  if (pathname.startsWith("/posts")) return true;
  if (pathname.startsWith("/sounds")) return true;
  // Post pages are at /<slug> — any path not matching known non-indexable prefixes
  if (nonIndexablePrefixes.some(p => pathname.startsWith(p))) return false;
  return true;
}

export default function SkeletonGate() {
  const pathname = usePathname();
  const initialPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!initialPathRef.current) {
      initialPathRef.current = pathname;
      const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const navType = navEntry?.type || "navigate";
      let isLoggedIn = false;
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
            const val = localStorage.getItem(key);
            if (val) { isLoggedIn = true; break; }
          }
        }
      } catch {}
      if (!isLoggedIn && (navType === "navigate" || navType === "reload") && isIndexablePath(pathname)) {
        document.documentElement.setAttribute("data-skeletons-off", "1");
      }
      return;
    }

    if (pathname !== initialPathRef.current) {
      document.documentElement.setAttribute("data-client-nav", "1");
      document.documentElement.removeAttribute("data-skeletons-off");
    }
  }, [pathname]);

  return null;
}
