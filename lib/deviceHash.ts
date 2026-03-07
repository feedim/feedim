// ─── Device Fingerprint ───
// Combines multiple browser signals into a stable hash for registration
// rate limiting. Stored in localStorage for persistence across sessions.

type NavigatorWithDeviceMemory = Navigator & {
  deviceMemory?: number;
};

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("Feedim:fp", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("Feedim:fp", 4, 17);
    return canvas.toDataURL().slice(-50);
  } catch {
    return "";
  }
}

function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) return "";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) return "";
    return `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}~${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`;
  } catch {
    return "";
  }
}

export function generateDeviceHash(): string {
  const navigatorWithDeviceMemory = navigator as NavigatorWithDeviceMemory;
  const signals = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${navigator.hardwareConcurrency || 0}`,
    `${navigatorWithDeviceMemory.deviceMemory || 0}`,
    navigator.platform || "",
    `${navigator.maxTouchPoints || 0}`,
    getCanvasFingerprint(),
    getWebGLFingerprint(),
  ].join("|");
  return cyrb53Hash(signals);
}

/** cyrb53 — fast hash with good distribution, 53-bit output */
function cyrb53Hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function getDeviceHash(): string {
  const key = "fdm_device_hash_v2";
  let hash = localStorage.getItem(key);
  if (!hash) {
    hash = generateDeviceHash();
    localStorage.setItem(key, hash);
    localStorage.removeItem("fdm_device_hash");
  }
  return hash;
}
