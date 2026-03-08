export const FRESHNESS_WINDOWS = {
  analyticsOverview: 300,
  settingsDerivedPanel: 300,
  profileSummaryAnalytics: 180,
  postStats: 120,
  boostInventory: 60,
  notificationSuggestions: 300,
  profileVisitors: 30,
  notificationCount: 15,
} as const;

export function buildPrivateCacheControl(seconds: number): string {
  return `private, max-age=${seconds}`;
}
