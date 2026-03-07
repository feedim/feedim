// Feedim — Çoklu Reklam Ağı Sağlayıcı Sistemi

export type AdProviderType = "adsense" | "gam" | "custom";

export interface AdProviderConfig {
  id: AdProviderType;
  name: string;
  scriptUrl?: string;
  clientId?: string;
  enabled: boolean;
}

// Sağlayıcı ayarları — yeni ağ eklemek için buraya eklemeniz yeterli
export const AD_PROVIDERS: Record<AdProviderType, AdProviderConfig> = {
  adsense: {
    id: "adsense",
    name: "Google AdSense",
    scriptUrl: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    clientId: "ca-pub-1411343179923275",
    enabled: true,
  },
  gam: {
    id: "gam",
    name: "Google Ad Manager",
    scriptUrl: "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
    enabled: false,
  },
  custom: {
    id: "custom",
    name: "Feedim Direct",
    // Kendi reklam sunucumuzdan — harici script gerekmez
    enabled: false,
  },
};

// Her slot için hangi sağlayıcı kullanılacak
export type AdSlot =
  | "feed"
  | "post-top"
  | "post-detail"
  | "post-bottom"
  | "explore"
  | "sidebar"
  | "overlay"
  | "moment";

export const SLOT_PROVIDER: Record<AdSlot, AdProviderType> = {
  feed: "adsense",
  "post-top": "adsense",
  "post-detail": "adsense",
  "post-bottom": "adsense",
  explore: "adsense",
  sidebar: "adsense",
  overlay: "adsense",
  moment: "adsense",
};

// Yardımcı fonksiyonlar
export function getProviderForSlot(slot: AdSlot): AdProviderConfig {
  const providerId = SLOT_PROVIDER[slot];
  return AD_PROVIDERS[providerId];
}

export function getEnabledProviders(): AdProviderConfig[] {
  return Object.values(AD_PROVIDERS).filter((p) => p.enabled);
}

export function getProviderById(id: AdProviderType): AdProviderConfig {
  return AD_PROVIDERS[id];
}
