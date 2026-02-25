// Feedim — Çoklu Reklam Ağı Sağlayıcı Sistemi

export type AdProviderType = "adsense" | "gam" | "custom" | "vast";

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
  vast: {
    id: "vast",
    name: "HilltopAds VAST",
    enabled: true,
  },
};

// VAST pre-roll tag URL (HilltopAds)
export const VAST_TAG_URL = "https://faithfuloccasion.com/dtmmFkzId.GgNNvdZiG/UF/reTms9zudZ/UtlAkiPFT/Yf4/M/jgYuw_NCjUk/tONqjRgbyNNkjyA/3/Mswy";

// HilltopAds display/interstitial script URL
export const HILLTOPADS_DISPLAY_URL = "https://faithfuloccasion.com/dtmmFkzId.GgNNvdZiG/UF/reTms9zudZ/UtlAkiPFT/Yf4/M/jgYuw_NCjUk/tONqjRgbyNNkjyA/3/Mswy";

// Overlay reklam rotasyonu: 1 AdSense → 5 HilltopAds → tekrar
let _overlayImpressionCount = 0;
const ADSENSE_EVERY = 6; // Her 6 gösterimde 1'i AdSense

export function getNextOverlayProvider(): "adsense" | "hilltopads" {
  const current = _overlayImpressionCount;
  _overlayImpressionCount++;
  return current % ADSENSE_EVERY === 0 ? "adsense" : "hilltopads";
}

export function resetOverlayRotation() {
  _overlayImpressionCount = 0;
}

// Her slot için hangi sağlayıcı kullanılacak
export type AdSlot =
  | "feed"
  | "post-top"
  | "post-detail"
  | "post-bottom"
  | "explore"
  | "sidebar"
  | "overlay"
  | "moment"
  | "video-preroll";

export const SLOT_PROVIDER: Record<AdSlot, AdProviderType> = {
  feed: "adsense",
  "post-top": "adsense",
  "post-detail": "adsense",
  "post-bottom": "adsense",
  explore: "adsense",
  sidebar: "adsense",
  overlay: "adsense",
  moment: "adsense",
  "video-preroll": "vast",
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
