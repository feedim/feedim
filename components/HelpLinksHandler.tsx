"use client";

import { useEffect } from "react";

/**
 * Null-render component that adds target="_blank" to all non-mailto links
 * inside the nearest <main> element. Uses MutationObserver to handle
 * dynamically rendered content (FAQ accordions, search results, etc.).
 */
export default function HelpLinksHandler() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;

    const process = () => {
      main
        .querySelectorAll('a[href]:not([href^="mailto:"]):not([target])')
        .forEach((a) => {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        });
    };

    process();
    const observer = new MutationObserver(process);
    observer.observe(main, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}
