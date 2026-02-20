"use client";

import { useEffect } from "react";

export default function HeaderTitle({ title }: { title: string }) {
  useEffect(() => {
    const h1 = document.querySelector("header nav h1");
    if (h1) h1.textContent = title;
    return () => { if (h1) h1.textContent = "Gönderi"; };
  }, [title]);
  return null;
}
