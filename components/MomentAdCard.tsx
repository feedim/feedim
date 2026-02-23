"use client";

import AdOverlay from "@/components/AdOverlay";

interface MomentAdCardProps {
  isActive: boolean;
  onSkip: () => void;
}

export default function MomentAdCard({ isActive, onSkip }: MomentAdCardProps) {
  return (
    <div
      className="snap-start snap-always h-[100svh] md:h-screen relative"
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
