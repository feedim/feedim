// Minimal event bus for navigation progress
// Used to trigger TopProgressBar from programmatic router.push() calls
type Listener = () => void;
let listeners: Listener[] = [];

export function emitNavigationStart() {
  listeners.forEach(fn => fn());
}

export function onNavigationStart(fn: Listener) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}
