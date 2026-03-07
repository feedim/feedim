"use client";

import AdOverlay from "@/components/AdOverlay";

interface MomentAdCardProps {
  isActive: boolean;
  onSkip: () => void;
}

export default function MomentAdCard({ isActive, onSkip }: MomentAdCardProps) {
  return (
    <div
      className="snap-start snap-always relative md:h-screen"
      style={{ backgroundColor: "#000", height: "100dvh", minHeight: "100svh" }}
    >
      <AdOverlay
        active={isActive}
        onSkip={onSkip}
        mode="fullscreen"
      />
    </div>
  );
}
