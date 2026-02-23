"use client";

import { useEffect } from "react";

function preloadAllModals() {
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
}

export default function ModalsPreload() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const run = () => preloadAllModals();

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run, { timeout: 500 });
    } else {
      setTimeout(run, 300);
    }

    const onFirstInteraction = () => {
      run();
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("mousedown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };

    window.addEventListener("touchstart", onFirstInteraction, { passive: true });
    window.addEventListener("mousedown", onFirstInteraction, { passive: true });
    window.addEventListener("keydown", onFirstInteraction);

    return () => {
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("mousedown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  return null;
}
