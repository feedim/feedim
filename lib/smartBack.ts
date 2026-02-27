import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { emitNavigationStart } from "@/lib/navigationProgress";

/**
 * Smart back navigation for components that have access to Next.js router.
 * Uses history.length to detect if there's a previous page (works with client-side navigation).
 * Falls back to `fallback` (default "/dashboard") when there's no history.
 */
export function smartBack(router: AppRouterInstance, fallback = "/dashboard") {
  if (window.history.length > 1) {
    router.back();
  } else {
    emitNavigationStart();
    router.push(fallback);
  }
}

/**
 * Smart back navigation without Next.js router (for ErrorState, leaving, not-found).
 * Falls back to `fallback` (default "/dashboard") when there's no history.
 */
export function smartBackRaw(fallback = "/dashboard") {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = fallback;
  }
}
