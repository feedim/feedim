// İzleme geçmişi — izlenen videoların slug listesi (localStorage)
// Autoplay ve sidebar'da izlenmemiş videoları önceliklendirmek için kullanılır

const STORAGE_KEY = "feedim-watch-history";
const MAX_ENTRIES = 500;

interface HistoryEntry {
  /** Ekleme zamanı (ms) */
  t: number;
}

type HistoryMap = Record<string, HistoryEntry>;

function getMap(): HistoryMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveMap(map: HistoryMap) {
  try {
    const keys = Object.keys(map);
    if (keys.length > MAX_ENTRIES) {
      const sorted = keys.sort((a, b) => (map[a].t || 0) - (map[b].t || 0));
      const toRemove = sorted.slice(0, keys.length - MAX_ENTRIES);
      for (const k of toRemove) delete map[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/** Video izleme geçmişine ekle */
export function addToWatchHistory(slug: string) {
  if (!slug) return;
  const map = getMap();
  map[slug] = { t: Date.now() };
  saveMap(map);
}

/** Belirli bir video izlenmiş mi? */
export function isWatched(slug: string): boolean {
  const map = getMap();
  return !!map[slug];
}

/** Tüm izlenmiş video slug'larını Set olarak döndür */
export function getWatchedSlugs(): Set<string> {
  return new Set(Object.keys(getMap()));
}
