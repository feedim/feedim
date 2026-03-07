import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { emitNavigationStart } from "@/lib/navigationProgress";

/**
 * Track whether user has navigated within the app (client-side).
 * history.length is unreliable — browsers start at 1-2 even for fresh tabs.
 * Instead, we track actual in-app navigation.
 */
let hasNavigated = false;

/** Whether the user has navigated within the app (for AuthLayout home/back logic). */
export function getHasNavigated() { return hasNavigated; }

if (typeof window !== "undefined") {
  // Mark as navigated on any in-app route change
  window.addEventListener("popstate", () => { hasNavigated = true; });
  // Track pushState only (client-side navigation).
  // replaceState is NOT tracked — Next.js calls it during hydration/init.
  const origPushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    hasNavigated = true;
    return origPushState(...args);
  };
}

/**
 * Smart back navigation for components that have access to Next.js router.
 * Falls back to `fallback` (default "/dashboard") when there's no history.
 */
export function smartBack(router: AppRouterInstance, fallback = "/dashboard") {
  if (hasNavigated) {
    router.back();
  } else {
    emitNavigationStart();
    router.push(fallback);
  }
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  });
}

/**
 * Smart back navigation without Next.js router (for ErrorState, leaving, not-found).
 * Falls back to `fallback` (default "/dashboard") when there's no history.
 */
export function smartBackRaw(fallback = "/dashboard") {
  if (hasNavigated) {
    window.history.back();
  } else {
    window.location.href = fallback;
  }
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  });
}
