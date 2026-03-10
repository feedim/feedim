import { getLocale, getTranslations } from "next-intl/server";

export interface SidebarLabels {
  locale: string;
  navPosts: string;
  navCommunityNotes: string;
  navVideo: string;
  navMoments: string;
  navHome: string;
  navNotifications: string;
  navBookmarks: string;
  navAnalytics: string;
  navBalance: string;
  navExplore: string;
  navSettings: string;
  navProfile: string;
  navShortcuts: string;
  tooltipHome: string;
  tooltipExplore: string;
  tooltipNotifications: string;
  tooltipProfile: string;
  tooltipSettings: string;
  tooltipMoments: string;
  tooltipTheme: string;
  tooltipShortcuts: string;
  tooltipCreate: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  themeDim: string;
  commonMore: string;
  commonCreate: string;
  commonUser: string;
  commonLogin: string;
}

export async function getSidebarLabels(): Promise<SidebarLabels> {
  const locale = await getLocale();
  const t = await getTranslations();

  return {
    locale,
    navPosts: t("nav.posts"),
    navCommunityNotes: t("nav.communityNotes"),
    navVideo: t("nav.video"),
    navMoments: t("nav.moments"),
    navHome: t("nav.home"),
    navNotifications: t("nav.notifications"),
    navBookmarks: t("nav.bookmarks"),
    navAnalytics: t("nav.analytics"),
    navBalance: t("nav.balance"),
    navExplore: t("nav.explore"),
    navSettings: t("nav.settings"),
    navProfile: t("nav.profile"),
    navShortcuts: t("nav.shortcuts"),
    tooltipHome: t("tooltip.home"),
    tooltipExplore: t("tooltip.explore"),
    tooltipNotifications: t("tooltip.notifications"),
    tooltipProfile: t("tooltip.profile"),
    tooltipSettings: t("tooltip.settings"),
    tooltipMoments: t("tooltip.moments"),
    tooltipTheme: t("tooltip.theme"),
    tooltipShortcuts: t("tooltip.shortcuts"),
    tooltipCreate: t("tooltip.create"),
    themeSystem: t("theme.system"),
    themeLight: t("theme.light"),
    themeDark: t("theme.dark"),
    themeDim: t("theme.dim"),
    commonMore: t("common.more"),
    commonCreate: t("common.create"),
    commonUser: t("common.user"),
    commonLogin: t("common.login"),
  };
}
