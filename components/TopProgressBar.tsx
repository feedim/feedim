"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { onNavigationStart } from "@/lib/navigationProgress";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const trickleRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (trickleRef.current) clearInterval(trickleRef.current);
  }, []);

  const start = useCallback(() => {
    cleanup();
    setProgress(0);
    setVisible(true);
    requestAnimationFrame(() => setProgress(30));
    trickleRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 80) return prev;
        return prev + (80 - prev) * 0.1;
      });
    }, 300);
  }, [cleanup]);

  const done = useCallback(() => {
    cleanup();
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setProgress(0), 200);
    }, 300);
  }, [cleanup]);

  // Pathname change → complete
  useEffect(() => {
    if (visible) done();
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catch internal <a> link clicks via delegation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (href === pathname) return;
      start();
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, start]);

  // Subscribe to programmatic navigation events (router.push)
  useEffect(() => {
    return onNavigationStart(start);
  }, [start]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[999999] h-[3px] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s" }}
    >
      <div
        className="h-full bg-accent-main"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? "none" : progress === 100
            ? "width 0.2s ease-out"
            : "width 0.4s ease",
        }}
      />
    </div>
  );
}
