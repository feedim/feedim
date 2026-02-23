"use client";

import { memo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface FeedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  followedTags?: Array<{ id: number; name: string; slug: string }>;
  isLoggedIn?: boolean;
}

const authRequiredTabs = new Set(["followed", "bookmarks"]);

export default memo(function FeedTabs({
  activeTab,
  onTabChange,
  followedTags = [],
  isLoggedIn = true,
}: FeedTabsProps) {
  const tabs = [
    { id: "for-you", label: "Senin İçin" },
    { id: "followed", label: "Takip" },
    { id: "bookmarks", label: "Kaydedilenler" },
    ...followedTags.map(tag => ({ id: `tag-${tag.slug}`, label: `#${tag.name}` })),
  ];

  const handleClick = useCallback((tabId: string) => {
    if (!isLoggedIn && authRequiredTabs.has(tabId)) {
      return;
    }
    onTabChange(tabId);
  }, [isLoggedIn, onTabChange]);

  return (
    <div className="sticky top-0 z-20 bg-bg-primary sticky-ambient px-1.5 sm:px-4 overflow-x-auto scrollbar-hide">
      <div className="flex gap-[6px] min-w-max">
        {tabs.map(tab => {
          const isAuthLocked = !isLoggedIn && authRequiredTabs.has(tab.id);
          return (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={cn(
              "px-[7px] py-3 text-[0.97rem] font-bold whitespace-nowrap border-b-[2.5px] transition-colors",
              activeTab === tab.id
                ? "border-accent-main text-text-primary"
                : "border-transparent text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary",
              isAuthLocked && "opacity-40 pointer-events-none"
            )}
          >
            {tab.label}
          </button>
        )})}
      </div>
    </div>
  );
})
