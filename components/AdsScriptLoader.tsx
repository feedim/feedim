"use client";

import { useEffect } from "react";
import Script from "next/script";

export default function AdsScriptLoader() {
  const enabled = typeof document !== "undefined" && document.documentElement.dataset.adsEnabled === "1";

  useEffect(() => {
    // If enabled later (toggle), update dataset and reload page to apply script.
    // Keeping this minimal to avoid unexpected side effects.
  }, []);

  if (!enabled) return null;

  return (
    <Script
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1411343179923275"
      strategy="lazyOnload"
      crossOrigin="anonymous"
    />
  );
}
