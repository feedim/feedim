// ─── Feed Preview Store ───
// Ensures only one PostCard video preview plays at a time.
// useSyncExternalStore-compatible for React 18 concurrent mode safety.

let _activeId: number | null = null;
const _listeners = new Set<() => void>();

export const feedPreviewStore = {
  getSnapshot: (): number | null => _activeId,
  getServerSnapshot: (): number | null => null,
  subscribe: (listener: () => void): (() => void) => {
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  },
  setActive: (id: number | null) => {
    _activeId = id;
    _listeners.forEach(fn => fn());
  },
};
