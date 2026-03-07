const EXACT_AUTH_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-mfa",
]);

const LEAN_PUBLIC_PREFIXES = [
  "/help",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/disclaimer",
  "/kvkk",
  "/payment-security",
  "/refund-policy",
  "/pre-information-form",
  "/distance-sales-contract",
  "/accessibility",
  "/community-guidelines",
  "/data-sharing",
  "/ai",
  "/copyright",
  "/analytics",
  "/content-types",
  "/profile-score",
];

const MODAL_HEAVY_EXCLUDES = [
  "/landing",
  "/leaving",
  "/payment",
  "/embed",
  "/account-moderation",
];

const ADS_SCRIPT_EXCLUDES = [
  ...LEAN_PUBLIC_PREFIXES,
  "/landing",
  "/onboarding",
  "/settings",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-mfa",
  "/payment",
  "/leaving",
  "/embed",
  "/account-moderation",
];

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function matchesAnyPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => matchesPrefix(pathname, prefix));
}

export interface RootRouteFeatures {
  useHotkeys: boolean;
  preloadModals: boolean;
  loadAdsScripts: boolean;
  loadAnalyticsScripts: boolean;
}

export function getRootRouteFeatures(pathname: string): RootRouteFeatures {
  const normalizedPath = pathname || "/";
  const isAuthRoute = EXACT_AUTH_ROUTES.has(normalizedPath);
  const isLeanPublicRoute = matchesAnyPrefix(normalizedPath, LEAN_PUBLIC_PREFIXES);
  const isModalHeavyExcluded = matchesAnyPrefix(normalizedPath, MODAL_HEAVY_EXCLUDES);
  const isAdsExcluded = matchesAnyPrefix(normalizedPath, ADS_SCRIPT_EXCLUDES);
  const isAnalyticsLeanRoute = isAuthRoute || isLeanPublicRoute || normalizedPath === "/account-moderation";

  const useHotkeys = !isAuthRoute && !isLeanPublicRoute && !isModalHeavyExcluded;
  const preloadModals = !isAuthRoute && !isLeanPublicRoute && !isModalHeavyExcluded;
  const loadAdsScripts = !isAdsExcluded;
  const loadAnalyticsScripts = !isAnalyticsLeanRoute;

  return {
    useHotkeys,
    preloadModals,
    loadAdsScripts,
    loadAnalyticsScripts,
  };
}
