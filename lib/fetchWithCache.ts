interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function getStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

function getCacheKey(url: string): string {
  return `fwc:${url}`;
}

function persistCacheEntry(cacheKey: string, entry: CacheEntry, storage: Storage | null): void {
  memoryCache.set(cacheKey, entry);
  if (!storage) return;
  try {
    storage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    clearOldEntries(storage);
    try {
      storage.setItem(cacheKey, JSON.stringify(entry));
    } catch {
      // Ignore storage write failures
    }
  }
}

export function withCacheScope(url: string, scope?: string | null): string {
  if (!scope) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_cv=${encodeURIComponent(scope)}`;
}

export async function fetchWithCache(
  url: string,
  options?: { ttlSeconds?: number; forceRefresh?: boolean },
): Promise<unknown> {
  const ttl = (options?.ttlSeconds ?? 30) * 1000;
  const storage = getStorage();
  const cacheKey = getCacheKey(url);

  // Try reading from cache (unless forced refresh)
  if (!options?.forceRefresh) {
    const memoryEntry = memoryCache.get(cacheKey);
    if (memoryEntry) {
      const age = Date.now() - memoryEntry.timestamp;
      if (age < memoryEntry.ttl) {
        return memoryEntry.data;
      }
    }
  }

  if (!options?.forceRefresh && storage) {
    try {
      const raw = storage.getItem(cacheKey);
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw);
        memoryCache.set(cacheKey, entry);
        const age = Date.now() - entry.timestamp;
        if (age < entry.ttl) {
          // Fresh — return immediately, no revalidation
          return entry.data;
        }
        // Stale — return stale data but revalidate in background
        revalidate(url, cacheKey, ttl, storage);
        return entry.data;
      }
    } catch {
      // Ignore parse errors
    }
  }

  const inFlight = inFlightRequests.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  // No cache — fetch fresh
  const request = fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const entry = { data, timestamp: Date.now(), ttl } satisfies CacheEntry;
      persistCacheEntry(cacheKey, entry, storage);

      return data;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);
  return request;
}

function revalidate(url: string, cacheKey: string, ttl: number, storage: Storage): void {
  if (inFlightRequests.has(cacheKey)) return;

  const request = fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const entry = { data, timestamp: Date.now(), ttl } satisfies CacheEntry;
      persistCacheEntry(cacheKey, entry, storage);
    })
    .catch(() => {
      // ignore
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, request);
}

function clearOldEntries(storage: Storage): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith("fwc:")) keysToRemove.push(key);
  }
  for (const key of keysToRemove) {
    storage.removeItem(key);
  }
}

/** Read cached data synchronously (for initializing state without loading flash) */
export function readCache(url: string): unknown | null {
  const storage = getStorage();
  const cacheKey = getCacheKey(url);
  const memoryEntry = memoryCache.get(cacheKey);
  if (memoryEntry) return memoryEntry.data;
  if (!storage) return null;
  try {
    const raw = storage.getItem(cacheKey);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    memoryCache.set(cacheKey, entry);
    // Return data regardless of staleness — caller will revalidate
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache(url: string, data: unknown, ttlSeconds = 30): void {
  const storage = getStorage();
  const cacheKey = getCacheKey(url);
  const entry = {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds * 1000,
  } satisfies CacheEntry;

  persistCacheEntry(cacheKey, entry, storage);
}

export function invalidateCache(prefix: string): void {
  const storage = getStorage();
  if (!storage) return;
  const fullPrefix = `fwc:${prefix}`;
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(fullPrefix)) keysToRemove.push(key);
  }
  for (const key of keysToRemove) {
    memoryCache.delete(key);
    storage.removeItem(key);
  }
}
