"use client";

import { memo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface FeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  followedTags?: Array<{ id: number; name: string; slug: string }>;
  isLoggedIn?: boolean;
}

const authRequiredTabs = new Set(["followed"]);

export default memo(function FeedTabs({
  activeTab,
  onTabChange,
  followedTags = [],
  isLoggedIn = true,
}: FeedTabsProps) {
  const t = useTranslations("feed");
  const tabs = [
    { id: "for-you", label: t("forYou") },
    { id: "followed", label: t("following") },
    ...followedTags.map(tag => ({ id: `tag-${tag.slug}`, label: `#${tag.name}` })),
  ];

  const handleClick = useCallback((tabId: string) => {
    if (!isLoggedIn && authRequiredTabs.has(tabId)) {
      window.location.href = `/login?next=${encodeURIComponent("/")}`;
      return;
    }
    onTabChange(tabId);
  }, [isLoggedIn, onTabChange]);

  return (
    <div className="sticky top-0 z-20 bg-bg-primary sticky-ambient px-1.5 sm:px-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-[6px] min-w-max">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={cn(
              "px-[7px] py-3 text-[0.97rem] font-bold whitespace-nowrap border-b-[2.5px] transition-colors",
              activeTab === tab.id
                ? "border-accent-main text-text-primary"
                : "border-transparent text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
})
