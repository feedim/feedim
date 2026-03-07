import { useMemo } from "react";
import { useHydrated } from "@/lib/useHydrated";

export function useShortcutHints() {
  const hydrated = useHydrated();

  const { isMac, show } = useMemo(() => {
    if (!hydrated) return { isMac: false, show: false };

    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";
    const mac = /Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X/.test(ua);
    const coarse = window.matchMedia ? window.matchMedia("(pointer: coarse)").matches : false;

    return {
      isMac: mac,
      show: !coarse,
    };
  }, [hydrated]);

  return useMemo(() => {
    const searchHint = show ? " (Shift+/)" : "";
    const commentHint = show ? " (c)" : "";
    const submitHint = show ? ` (${isMac ? "Cmd" : "Ctrl"}+Enter)` : "";
    return { isMac, show, searchHint, commentHint, submitHint };
  }, [isMac, show]);
}
