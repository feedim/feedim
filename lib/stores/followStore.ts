// ─── Follow Status Store ───
// Caches follow status per username, shared across PostCard instances.
// useSyncExternalStore-compatible for React 18 concurrent mode safety.

type FollowStatus = boolean | "loading";

const _cache = new Map<string, FollowStatus>();
const _listeners = new Set<() => void>();

function _notify() {
  _listeners.forEach(fn => fn());
}

export function getFollowStatus(username: string): FollowStatus | undefined {
  return _cache.get(username);
}

export function setFollowStatus(username: string, value: FollowStatus) {
  _cache.set(username, value);
  _notify();
}

export function deleteFollowStatus(username: string) {
  _cache.delete(username);
  _notify();
}

export function subscribeFollowStore(listener: () => void): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}
