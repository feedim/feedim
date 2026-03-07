"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll to top on every pathname change (forward and back).
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;
    prevPathname.current = pathname;

    const main = document.querySelector("main.md\\:overflow-y-auto");
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
