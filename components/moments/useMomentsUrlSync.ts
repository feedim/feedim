"use client";

import { useEffect } from "react";
import type { DisplayItem } from "@/components/moments/types";

interface UseMomentsUrlSyncOptions {
  settledIndex: number;
  displayItems: DisplayItem[];
}

export function useMomentsUrlSync({
  settledIndex,
  displayItems,
}: UseMomentsUrlSyncOptions) {
  useEffect(() => {
    const item = displayItems[settledIndex];
    if (item?.type === "moment") {
      window.history.replaceState(null, "", `/moments?s=${item.moment.slug}`);
    }
  }, [displayItems, settledIndex]);
}
