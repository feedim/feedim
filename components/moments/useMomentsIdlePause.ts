"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { smartBack } from "@/lib/smartBack";

interface UseMomentsIdlePauseOptions {
  router: AppRouterInstance;
}

export function useMomentsIdlePause({ router }: UseMomentsIdlePauseOptions) {
  const [idlePaused, setIdlePaused] = useState(false);
  const lastInteractionRef = useRef(0);
  const idleCheckRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    lastInteractionRef.current = Date.now();
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove", "wheel"] as const;
    const handler = () => {
      lastInteractionRef.current = Date.now();
    };

    events.forEach((eventName) =>
      window.addEventListener(eventName, handler, { passive: true, capture: true })
    );

    idleCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= 15 * 60 * 1000) {
        setIdlePaused(true);
      }
    }, 30_000);

    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, handler, { capture: true } as EventListenerOptions)
      );
      clearInterval(idleCheckRef.current);
    };
  }, []);

  const handleContinueWatching = useCallback(() => {
    lastInteractionRef.current = Date.now();
    setIdlePaused(false);
  }, []);

  const handleStopWatching = useCallback(() => {
    smartBack(router, "/dashboard");
  }, [router]);

  return {
    idlePaused,
    handleContinueWatching,
    handleStopWatching,
  };
}
