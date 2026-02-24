"use client";

import { useState, useEffect } from "react";
import { getWatchPercent } from "@/lib/watchProgress";

interface WatchProgressBarProps {
  slug: string;
  className?: string;
}

/** YouTube tarzı izleme ilerleme çubuğu — thumbnail'ın en altında gösterilir */
export default function WatchProgressBar({ slug, className = "" }: WatchProgressBarProps) {
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    setPercent(getWatchPercent(slug));
  }, [slug]);

  if (percent === null || percent < 0.02) return null;

  return (
    <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 ${className}`}>
      <div
        className="h-full rounded-r-full"
        style={{
          width: `${Math.round(percent * 100)}%`,
          backgroundColor: "var(--accent-color, #e53e3e)",
        }}
      />
    </div>
  );
}
