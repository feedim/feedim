"use client";

import { useEffect, useRef } from "react";

export default function LazysizesInit() {
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    // Load immediately — don't defer with dynamic import wrapper
    import("@/lib/lazysizes").then(({ initLazySizes }) => initLazySizes());
  }, []);
  return null;
}
