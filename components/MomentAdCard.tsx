"use client";

import AdOverlay from "@/components/AdOverlay";

interface MomentAdCardProps {
  isActive: boolean;
  onSkip: () => void;
}

export default function MomentAdCard({ isActive, onSkip }: MomentAdCardProps) {
  return (
    <div
      className="relative w-full h-full"
      style={{ backgroundColor: "#000" }}
    >
      <AdOverlay
        active={isActive}
        onSkip={onSkip}
        mode="fullscreen"
      />
    </div>
  );
}
