export const FRESHNESS_WINDOWS = {
  analyticsOverview: 120,
  settingsDerivedPanel: 120,
  profileSummaryAnalytics: 60,
  postStats: 30,
  boostInventory: 30,
  notificationSuggestions: 120,
  profileVisitors: 15,
  notificationCount: 10,
} as const;

export function buildPrivateCacheControl(seconds: number): string {
  return `private, max-age=${seconds}`;
}
