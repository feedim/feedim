"use client";

const STORAGE_PREFIX = "fdm-post-interactions";
const EVENT_NAME = "fdm-post-interaction";
const MAX_ENTRIES = 1000;
const TTL_MS = 1000 * 60 * 60 * 6;

export interface StoredPostInteraction {
  liked?: boolean;
  saved?: boolean;
  likeCount?: number;
  saveCount?: number;
  updatedAt: number;
}

interface InteractionMap {
  [postId: string]: StoredPostInteraction;
}

interface PostInteractionEventDetail {
  viewerId: string;
  postId: number;
  value: StoredPostInteraction | null;
}

function getStorageKey(viewerId: string): string {
  return `${STORAGE_PREFIX}:${viewerId}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeEntry(value: unknown): StoredPostInteraction | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<StoredPostInteraction>;
  const next: Partial<StoredPostInteraction> = {};

  if (typeof raw.liked === "boolean") next.liked = raw.liked;
  if (typeof raw.saved === "boolean") next.saved = raw.saved;
  if (isFiniteNumber(raw.likeCount)) next.likeCount = Math.max(0, Math.trunc(raw.likeCount));
  if (isFiniteNumber(raw.saveCount)) next.saveCount = Math.max(0, Math.trunc(raw.saveCount));

  const hasPayload =
    typeof next.liked === "boolean" ||
    typeof next.saved === "boolean" ||
    isFiniteNumber(next.likeCount) ||
    isFiniteNumber(next.saveCount);

  if (!hasPayload) return null;

  return {
    ...next,
    updatedAt: isFiniteNumber(raw.updatedAt) ? raw.updatedAt : Date.now(),
  };
}

function readMap(viewerId: string): InteractionMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(getStorageKey(viewerId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: InteractionMap = {};
    let changed = false;
    const now = Date.now();

    for (const [postId, value] of Object.entries(parsed || {})) {
      const entry = sanitizeEntry(value);
      if (!entry) {
        changed = true;
        continue;
      }
      if (now - entry.updatedAt > TTL_MS) {
        changed = true;
        continue;
      }
      map[postId] = entry;
    }

    const ids = Object.keys(map);
    if (ids.length > MAX_ENTRIES) {
      ids
        .sort((a, b) => (map[a]?.updatedAt || 0) - (map[b]?.updatedAt || 0))
        .slice(0, ids.length - MAX_ENTRIES)
        .forEach((id) => {
          delete map[id];
          changed = true;
        });
    }

    if (changed) {
      localStorage.setItem(getStorageKey(viewerId), JSON.stringify(map));
    }

    return map;
  } catch {
    return {};
  }
}

function writeMap(viewerId: string, map: InteractionMap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getStorageKey(viewerId), JSON.stringify(map));
  } catch {}
}

function emit(detail: PostInteractionEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PostInteractionEventDetail>(EVENT_NAME, { detail }));
}

function entriesEqual(a: StoredPostInteraction | null, b: StoredPostInteraction | null): boolean {
  return (
    a?.liked === b?.liked &&
    a?.saved === b?.saved &&
    a?.likeCount === b?.likeCount &&
    a?.saveCount === b?.saveCount &&
    a?.updatedAt === b?.updatedAt
  );
}

export function readPostInteraction(viewerId: string | null | undefined, postId: number): StoredPostInteraction | null {
  if (!viewerId) return null;
  const map = readMap(viewerId);
  return sanitizeEntry(map[String(postId)]) || null;
}

export function writePostInteraction(
  viewerId: string | null | undefined,
  postId: number,
  patch: Partial<Omit<StoredPostInteraction, "updatedAt">>,
): StoredPostInteraction | null {
  if (!viewerId) return null;

  const map = readMap(viewerId);
  const current = sanitizeEntry(map[String(postId)]) || null;
  const next = sanitizeEntry({
    ...current,
    ...patch,
    updatedAt: Date.now(),
  });

  if (!next) return null;

  map[String(postId)] = next;
  writeMap(viewerId, map);
  emit({ viewerId, postId, value: next });
  return next;
}

export function subscribePostInteractions(
  callback: (detail: PostInteractionEventDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleEvent = (event: Event) => {
    callback((event as CustomEvent<PostInteractionEventDetail>).detail);
  };

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || !event.key.startsWith(`${STORAGE_PREFIX}:`)) return;

    const viewerId = event.key.slice(`${STORAGE_PREFIX}:`.length);
    if (!viewerId) return;

    let previous: Record<string, unknown> = {};
    let next: Record<string, unknown> = {};

    try {
      previous = event.oldValue ? JSON.parse(event.oldValue) : {};
    } catch {}
    try {
      next = event.newValue ? JSON.parse(event.newValue) : {};
    } catch {}

    const ids = new Set([...Object.keys(previous), ...Object.keys(next)]);
    ids.forEach((id) => {
      const prevEntry = sanitizeEntry(previous[id]);
      const nextEntry = sanitizeEntry(next[id]);
      if (entriesEqual(prevEntry, nextEntry)) return;
      callback({
        viewerId,
        postId: Number(id),
        value: nextEntry,
      });
    });
  };

  window.addEventListener(EVENT_NAME, handleEvent);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, handleEvent);
    window.removeEventListener("storage", handleStorage);
  };
}
