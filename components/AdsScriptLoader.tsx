"use client";

import { useEffect } from "react";
import { getEnabledProviders } from "@/lib/adProviders";

export default function AdsScriptLoader() {
  useEffect(() => {
    if (document.documentElement.dataset.adsEnabled !== "1") return;

    const providers = getEnabledProviders();

    for (const provider of providers) {
      if (!provider.scriptUrl) continue;

      // Script zaten yüklü mü kontrol et
      const selector = `script[src*="${new URL(provider.scriptUrl).hostname}"]`;
      if (document.querySelector(selector)) continue;

      const script = document.createElement("script");
      script.src = provider.clientId
        ? `${provider.scriptUrl}?client=${provider.clientId}`
        : provider.scriptUrl;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  }, []);

  return null;
}
