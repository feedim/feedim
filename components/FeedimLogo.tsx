"use client";

import { useEffect, useState } from "react";

interface LogoProps {
  className?: string;
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDark(theme === "dark" || theme === "dim");
    };
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/** Full "Feedim" wordmark — uses currentColor, auto theme-aware */
export function FeedimLogo({ className = "h-[22px]" }: LogoProps) {
  return (
    <img
      src="/imgs/logo.svg"
      alt="Feedim"
      className={className}
      draggable={false}
    />
  );
}

/** "F" icon mark (collapsed sidebar) — switches between light/dark versions */
export function FeedimIcon({ className = "h-9 w-9" }: LogoProps) {
  const isDark = useIsDark();
  return (
    <img
      src={isDark ? "/imgs/feedim-mobile-dark.svg" : "/imgs/feedim-mobile.svg"}
      alt="Feedim"
      className={className}
      draggable={false}
    />
  );
}
