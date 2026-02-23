import { useEffect, useMemo, useState } from "react";

export function useShortcutHints() {
  const [isMac, setIsMac] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
    const platform = typeof navigator !== "undefined" ? navigator.platform || "" : "";
    const mac = /Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X/.test(ua);
    setIsMac(mac);
    const coarse = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(pointer: coarse)").matches
      : false;
    setShow(!coarse);
  }, []);

  return useMemo(() => {
    const searchHint = show ? " (Shift+/)" : "";
    const commentHint = show ? " (c)" : "";
    const submitHint = show ? ` (${isMac ? "Cmd" : "Ctrl"}+Enter)` : "";
    return { isMac, show, searchHint, commentHint, submitHint };
  }, [isMac, show]);
}
