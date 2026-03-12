"use client";

import BackButton from "@/components/BackButton";
import FeedFilterSelect from "@/components/FeedFilterSelect";
import type { FeedMode } from "@/components/moments/types";
import { Volume2, VolumeX } from "lucide-react";

interface FilterOption {
  id: string;
  label: string;
}

interface MomentsTopBarProps {
  feedMode: FeedMode;
  filterOptions: FilterOption[];
  onFeedModeChange: (nextValue: string) => void;
  title: string;
  filterTitle: string;
  globalMuted: boolean;
  onToggleMute: () => void;
  muteLabel: string;
  unmuteLabel: string;
}

export default function MomentsTopBar({
  feedMode,
  filterOptions,
  onFeedModeChange,
  title,
  filterTitle,
  globalMuted,
  onToggleMute,
  muteLabel,
  unmuteLabel,
}: MomentsTopBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-[60] flex items-center px-3.5 pt-4 pb-2 pointer-events-none">
      <BackButton variant="overlay" />
      <div className="flex-1 flex justify-center">
        <FeedFilterSelect
          value={feedMode}
          options={filterOptions}
          onChange={onFeedModeChange}
          modalTitle={filterTitle}
          variant="overlay-title"
          title={title}
          overlayShowSubtitle={false}
          overlayUseActiveLabelAsTitle
          overlayDefaultValue="for-you"
        />
      </div>
      <button
        onClick={onToggleMute}
        className="w-10 h-10 rounded-full flex items-center justify-center pointer-events-auto active:scale-90 transition-transform"
        aria-label={globalMuted ? unmuteLabel : muteLabel}
      >
        {globalMuted ? (
          <VolumeX className="h-5 w-5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
        ) : (
          <Volume2 className="h-5 w-5 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
        )}
      </button>
    </div>
  );
}
