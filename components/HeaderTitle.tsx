"use client";

import { useEffect } from "react";

export default function HeaderTitle({ title }: { title: string }) {
  useEffect(() => {
    const el = document.querySelector("header nav span.font-bold") as HTMLElement | null;
    if (!el) return;
    const prev = el.textContent;
    const wasHidden = el.classList.contains("hidden");
    el.textContent = title;
    el.classList.remove("hidden");
    return () => {
      if (el) {
        el.textContent = prev || "";
        if (wasHidden) el.classList.add("hidden");
      }
    };
  }, [title]);
  return null;
}
