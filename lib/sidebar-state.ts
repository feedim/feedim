"use client";

import { useSyncExternalStore, useEffect } from "react";

let collapsed = false;
let initialized = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return collapsed;
}

function getServerSnapshot() {
  return false;
}

export function toggleSidebarCollapsed() {
  collapsed = !collapsed;
  try {
    localStorage.setItem("fdm-sidebar-collapsed", collapsed ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

export function useSidebarCollapsed() {
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      const saved = localStorage.getItem("fdm-sidebar-collapsed");
      if (saved === "1" && !collapsed) {
        collapsed = true;
        listeners.forEach((l) => l());
      }
    }
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
