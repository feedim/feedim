export function normalizeNextPath(next?: string, fallback = "/"): string {
  const value = (next || "").trim();
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  return value;
}

export function currentPathWithSearch(fallback = "/"): string {
  if (typeof window === "undefined") return fallback;
  const path = window.location.pathname || "/";
  const search = window.location.search || "";
  return `${path}${search}`;
}

export function buildLoginUrl(next?: string, fallback = "/"): string {
  const safeNext = normalizeNextPath(next, fallback);
  return `/login?next=${encodeURIComponent(safeNext)}`;
}

export function redirectToLogin(next?: string, fallback = "/"): void {
  if (typeof window === "undefined") return;
  const target = next ?? currentPathWithSearch(fallback);
  window.location.href = buildLoginUrl(target, fallback);
}
