interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

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

export async function fetchWithCache(
  url: string,
  options?: { ttlSeconds?: number; forceRefresh?: boolean },
): Promise<unknown> {
  const ttl = (options?.ttlSeconds ?? 30) * 1000;
  const storage = getStorage();
  const cacheKey = getCacheKey(url);

  // Try reading from cache (unless forced refresh)
  if (!options?.forceRefresh && storage) {
    try {
      const raw = storage.getItem(cacheKey);
      if (raw) {
        const entry: CacheEntry = JSON.parse(raw);
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

  // No cache — fetch fresh
  const res = await fetch(url);
  const data = await res.json();

  if (storage) {
    try {
      storage.setItem(
        cacheKey,
        JSON.stringify({ data, timestamp: Date.now(), ttl } satisfies CacheEntry),
      );
    } catch {
      // Storage full — clear old entries and retry
      clearOldEntries(storage);
    }
  }

  return data;
}

function revalidate(url: string, cacheKey: string, ttl: number, storage: Storage): void {
  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      try {
        storage.setItem(
          cacheKey,
          JSON.stringify({ data, timestamp: Date.now(), ttl } satisfies CacheEntry),
        );
      } catch {
        // ignore
      }
    })
    .catch(() => {
      // ignore
    });
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
  if (!storage) return null;
  try {
    const raw = storage.getItem(getCacheKey(url));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    // Return data regardless of staleness — caller will revalidate
    return entry.data;
  } catch {
    return null;
  }
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
    storage.removeItem(key);
  }
}
