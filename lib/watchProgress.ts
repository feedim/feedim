// Video izleme ilerleme takibi (localStorage tabanlı)
// YouTube tarzı — izlenen süre hatırlanır, thumbnail altında progress bar gösterilir

const STORAGE_KEY = "feedim-watch-progress";
const MAX_ENTRIES = 200; // Çok fazla girişi temizle

export interface WatchEntry {
  /** İzlenen saniye */
  time: number;
  /** Video toplam süresi (saniye) */
  duration: number;
  /** Son güncelleme zamanı (ms) */
  updatedAt: number;
}

type ProgressMap = Record<string, WatchEntry>;

function getMap(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map: ProgressMap) {
  try {
    // Çok fazla giriş birikirse en eskileri temizle
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys.sort((a, b) => (map[a].updatedAt || 0) - (map[b].updatedAt || 0));
      const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES);
      for (const k of toRemove) delete map[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/** İzleme ilerlemesini kaydet */
export function saveWatchProgress(slug: string, time: number, duration: number) {
  if (!slug || !duration || duration < 5) return;
  // Videoyu bitirdiyse (%95+) kaydı temizle
  if (time / duration >= 0.95) {
    removeWatchProgress(slug);
    return;
  }
  // Çok erken kaydetme (ilk 3 saniye)
  if (time < 3) return;

  const map = getMap();
  map[slug] = { time, duration, updatedAt: Date.now() };
  saveMap(map);
}

/** Belirli bir videonun ilerlemesini al */
export function getWatchProgress(slug: string): WatchEntry | null {
  const map = getMap();
  return map[slug] || null;
}

/** İlerleme yüzdesi (0-1) döndür, kayıt yoksa null */
export function getWatchPercent(slug: string): number | null {
  const entry = getWatchProgress(slug);
  if (!entry || !entry.duration) return null;
  return Math.min(entry.time / entry.duration, 1);
}

/** İzleme kaydını sil (video bitirildiğinde) */
export function removeWatchProgress(slug: string) {
  const map = getMap();
  delete map[slug];
  saveMap(map);
}

/** Tüm videoların ilerlemelerini al — VideoGridCard listesi için */
export function getAllProgress(): ProgressMap {
  return getMap();
}
