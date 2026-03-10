"use client";

import { useEffect } from "react";

type IdleCallbackWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

let criticalModalsPreloaded = false;
let allModalsPreloaded = false;
let criticalPrewarmScheduled = false;

function preloadCriticalModals() {
  if (criticalModalsPreloaded) return;
  criticalModalsPreloaded = true;

  import("@/components/modals/Modal");
  import("@/components/modals/CommentsModal");
  import("@/components/modals/ShareModal");
  import("@/components/modals/PostMoreModal");
  import("@/components/modals/LikesModal");
  import("@/components/modals/GiftModal");
  import("@/components/modals/ReportModal");
  import("@/components/modals/FollowersModal");
  import("@/components/modals/FollowingModal");
  import("@/components/modals/ProfileMoreModal");
  import("@/components/modals/EditProfileModal");
  import("@/components/modals/PostStatsModal");
  import("@/components/modals/SettingsModal");
  import("@/components/modals/UserListModal");
  import("@/components/modals/AvatarViewModal");
  import("@/components/modals/FollowRequestsModal");
  import("@/components/modals/MutualFollowersModal");
  import("@/components/modals/ProfileVisitorsModal");
  import("@/components/modals/CreateMenuModal");
  import("@/components/modals/DarkModeModal");
  import("@/components/modals/BoostModal");
  import("@/components/modals/BoostDetailsModal");
  import("@/components/modals/MyBoostsModal");
  import("@/components/modals/PremiumWelcomeModal");
  import("@/components/modals/ProfileLinksModal");
}

function preloadAllModals() {
  if (allModalsPreloaded) return;
  allModalsPreloaded = true;

  preloadCriticalModals();
  import("@/components/modals/ProfessionalAccountModal");
  import("@/components/modals/LinksModal");
}

if (typeof window !== "undefined" && !criticalPrewarmScheduled) {
  criticalPrewarmScheduled = true;
  Promise.resolve().then(() => preloadCriticalModals());
}

export default function ModalsPreload() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const idleWindow = window as IdleCallbackWindow;
    let rafId: number | null = null;
    let criticalTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let fullTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;

    rafId = window.requestAnimationFrame(() => {
      criticalTimeoutId = setTimeout(() => preloadCriticalModals(), 0);
    });

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => preloadAllModals(), { timeout: 900 });
    } else {
      fullTimeoutId = setTimeout(() => preloadAllModals(), 220);
    }

    const onFirstInteraction = () => {
      preloadCriticalModals();
      preloadAllModals();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };

    window.addEventListener("pointerdown", onFirstInteraction, { passive: true });
    window.addEventListener("keydown", onFirstInteraction);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (criticalTimeoutId !== null) clearTimeout(criticalTimeoutId);
      if (fullTimeoutId !== null) clearTimeout(fullTimeoutId);
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  return null;
}
