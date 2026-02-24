"use client";

import { useEffect } from "react";

export default function AdsScriptLoader() {
  useEffect(() => {
    if (document.documentElement.dataset.adsEnabled !== "1") return;
    if (document.querySelector('script[src*="adsbygoogle"]')) return;

    const script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1411343179923275";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, []);

  return null;
}
