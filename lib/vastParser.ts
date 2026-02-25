/**
 * Feedim — VAST 3.0 Video Ad Parser
 * Parses VAST XML to extract video ad data for pre-roll playback.
 */

export interface VastAd {
  videoUrl: string;
  mediaUrls: string[];
  duration: number;
  clickUrl?: string;
  impressionUrls: string[];
  trackingEvents: Record<string, string[]>;
}

/**
 * Parse VAST XML from a tag URL. Handles InLine and single-level Wrapper.
 * Returns null if no valid ad found.
 */
export async function parseVast(tagUrl: string, depth = 0): Promise<VastAd | null> {
  if (depth > 5) return null;

  try {
    const res = await fetch(tagUrl, { cache: "no-store" });
    if (!res.ok) return null;

    let text = await res.text();
    if (!text.trim()) return null;

    // Strip XML namespace — browsers' querySelector doesn't match namespaced elements
    text = text.replace(/\s+xmlns\s*=\s*"[^"]*"/g, "");

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");

    if (doc.querySelector("parsererror")) return null;

    // Try all Ad elements — first valid one wins
    const ads = doc.querySelectorAll("Ad");
    if (ads.length === 0) return null;

    for (const ad of ads) {
      const result = await parseAdElement(ad, depth);
      if (result) return result;
    }

    return null;
  } catch {
    return null;
  }
}

/** Parse a single <Ad> element — handles both InLine and Wrapper. */
async function parseAdElement(ad: Element, depth: number): Promise<VastAd | null> {
  // Handle Wrapper — follow VAST redirect
  const wrapper = ad.querySelector("Wrapper");
  if (wrapper) {
    const uri = wrapper.querySelector("VASTAdTagURI")?.textContent?.trim();
    if (uri) return parseVast(uri, depth + 1);
    return null;
  }

  const inline = ad.querySelector("InLine");
  if (!inline) return null;

  // Impression URLs
  const impressionUrls: string[] = [];
  inline.querySelectorAll("Impression").forEach(el => {
    const url = el.textContent?.trim();
    if (url) impressionUrls.push(url);
  });

  // Find Linear creative
  const linear = inline.querySelector("Linear");
  if (!linear) return null;

  // Duration
  const durStr = linear.querySelector("Duration")?.textContent?.trim() || "00:00:15";
  const [h, m, s] = durStr.split(":").map(Number);
  const duration = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);

  // Media files — prefer MP4/progressive; lower resolutions start faster on weak links
  const files: { url: string; type: string; w: number; delivery: string }[] = [];
  linear.querySelectorAll("MediaFile").forEach(el => {
    const url = el.textContent?.trim();
    const type = el.getAttribute("type") || "";
    const w = parseInt(el.getAttribute("width") || "0");
    const delivery = (el.getAttribute("delivery") || "").toLowerCase();
    if (url) files.push({ url, type, w, delivery });
  });

  files.sort((a, b) => {
    const aType = a.type.toLowerCase();
    const bType = b.type.toLowerCase();
    const aMp4 = aType.includes("mp4") ? 1 : 0;
    const bMp4 = bType.includes("mp4") ? 1 : 0;
    if (aMp4 !== bMp4) return bMp4 - aMp4;

    const aProg = a.delivery === "progressive" ? 1 : 0;
    const bProg = b.delivery === "progressive" ? 1 : 0;
    if (aProg !== bProg) return bProg - aProg;

    // Prefer smaller files first to reduce startup timeouts on ad CDNs.
    return a.w - b.w;
  });

  const mediaUrls = Array.from(new Set(files.map(file => file.url)));
  if (mediaUrls.length === 0) return null;

  // Click-through URL
  const clickUrl = linear.querySelector("VideoClicks ClickThrough")?.textContent?.trim()
    || linear.querySelector("ClickThrough")?.textContent?.trim()
    || undefined;

  // Tracking events
  const trackingEvents: Record<string, string[]> = {};
  linear.querySelectorAll("TrackingEvents Tracking").forEach(el => {
    const event = el.getAttribute("event");
    const url = el.textContent?.trim();
    if (event && url) {
      (trackingEvents[event] ??= []).push(url);
    }
  });

  // Click tracking
  linear.querySelectorAll("VideoClicks ClickTracking").forEach(el => {
    const url = el.textContent?.trim();
    if (url) (trackingEvents["click"] ??= []).push(url);
  });

  return {
    videoUrl: mediaUrls[0],
    mediaUrls,
    duration,
    clickUrl,
    impressionUrls,
    trackingEvents,
  };
}

/** Fire tracking pixel(s) non-blocking. */
export function firePixels(urls?: string[]) {
  if (!urls?.length) return;
  urls.forEach(url => { try { new Image().src = url; } catch {} });
}
