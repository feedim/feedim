"use client";

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { emitNavigationStart } from "@/lib/navigationProgress";
const HotkeysHelpModal = lazy(() => import("@/components/HotkeysHelpModal"));

type HotkeyTarget = HTMLElement | null;

function isEditable(el: HTMLElement | null) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

function isModalOpen() {
  return !!document.querySelector('[data-modal="true"]');
}

function findVisibleHotkey(key: string): HotkeyTarget {
  const list = Array.from(document.querySelectorAll<HTMLElement>(`[data-hotkey="${key}"]`));
  for (const el of list) {
    if (!el) continue;
    if ((el as HTMLButtonElement).disabled) continue;
    if (!el.offsetParent) continue;
    return el;
  }
  return null;
}

function focusSearch() {
  const direct = document.querySelector<HTMLElement>(`[data-hotkey="search"]`);
  if (direct && (direct as HTMLInputElement).focus) {
    (direct as HTMLInputElement).focus();
    (direct as HTMLInputElement).select?.();
    return true;
  }
  const fallback = document.querySelector<HTMLInputElement>(
    'input[type="search"], input[placeholder*="Ara"], input[placeholder*="ara"]'
  );
  if (fallback) {
    fallback.focus();
    fallback.select?.();
    return true;
  }
  return false;
}

export default function GlobalHotkeys() {
  const router = useRouter();
  const pathname = usePathname();
  const seqRef = useRef<{ key: "g"; ts: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      // Cmd/Ctrl + / -> go to explore search and focus
      if ((e.metaKey || e.ctrlKey) && (e.key === "/" || e.code === "Slash")) {
        e.preventDefault();
        try { sessionStorage.setItem("fdm-focus-search", "1"); } catch {}
        if (pathname !== "/explore") {
          emitNavigationStart();
          router.push("/explore");
        } else {
          focusSearch();
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const active = document.activeElement as HTMLElement | null;
      if (isEditable(active)) return;

      const key = e.key.toLowerCase();
      const isMoments = pathname.startsWith("/moments");
      const hasActiveMoment = !!document.querySelector('[data-moment-active="true"]');
      const hasVideoPlayer = !!document.querySelector(".vp-bar");

      // When a modal is open, allow "c" to refocus comment input
      if (isModalOpen()) {
        if (key === "c") {
          const input = document.querySelector<HTMLElement>('[data-hotkey="comment-input"]');
          if (input && (input as HTMLInputElement).focus) {
            e.preventDefault();
            (input as HTMLInputElement).focus();
            (input as HTMLInputElement).select?.();
          }
        }
        return;
      }

      // "g + <key>" navigation combos
      if (seqRef.current && Date.now() - seqRef.current.ts < 800) {
        const next = key;
        seqRef.current = null;
        const map: Record<string, string> = {
          h: "/",
          e: "/explore",
          m: "/moments",
          p: "/profile",
          s: "/settings",
          n: "/notifications",
        };
        const dest = map[next];
        if (dest) {
          e.preventDefault();
          if (pathname !== dest) { emitNavigationStart(); router.push(dest); }
          return;
        }
      }

      if (key === "g") {
        seqRef.current = { key: "g", ts: Date.now() };
        return;
      }

      // Prefer search focus when possible (avoids "?" layout conflicts)
      if ((e.key === "/" || e.key === "?" || e.code === "Slash")) {
        if (focusSearch()) { e.preventDefault(); return; }
      }

      if (e.key === "?" || (e.key === "/" && e.shiftKey) || (e.code === "Slash" && e.shiftKey)) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Primary actions (visible, context-aware)
      if (key === "c") {
        if (isMoments && hasActiveMoment) return;
        const el = findVisibleHotkey("comments");
        if (el) { e.preventDefault(); el.click(); }
        return;
      }
      if (key === "l") {
        if (isMoments && hasActiveMoment) return;
        if (hasVideoPlayer) return;
        const el = findVisibleHotkey("like");
        if (el) { e.preventDefault(); el.click(); }
        return;
      }
      if (key === "b") {
        if (isMoments && hasActiveMoment) return;
        const el = findVisibleHotkey("save");
        if (el) { e.preventDefault(); el.click(); }
        return;
      }
      if (key === "s") {
        if (isMoments && hasActiveMoment) return;
        const el = findVisibleHotkey("share");
        if (el) { e.preventDefault(); el.click(); }
        return;
      }
      if (key === "e") {
        const el = findVisibleHotkey("edit-profile");
        if (el) { e.preventDefault(); el.click(); }
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, pathname]);

  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener("fdm-open-hotkeys", openHandler as EventListener);
    return () => window.removeEventListener("fdm-open-hotkeys", openHandler as EventListener);
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <HotkeysHelpModal open={open} onClose={() => setOpen(false)} />
    </Suspense>
  );
}
