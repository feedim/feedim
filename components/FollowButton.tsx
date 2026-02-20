"use client";

import { memo } from "react";
import { UserPlus, Check, Clock } from "lucide-react";

interface FollowButtonProps {
  following: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** "default" = Takip Et/Takip, "profile" = Takip Et/Takip Ediliyor, "tag" = Takip Et/Takipte */
  variant?: "default" | "profile" | "tag";
  /** When true and following, shows "İstek" instead of follow text */
  isPrivate?: boolean;
  className?: string;
}

const TEXT_MAP = {
  default: { follow: "Takip Et", following: "Takip" },
  profile: { follow: "Takip Et", following: "Takip Ediliyor" },
  tag: { follow: "Takip Et", following: "Takipte" },
};

export default memo(function FollowButton({
  following,
  onClick,
  disabled,
  variant = "default",
  isPrivate,
  className = "",
}: FollowButtonProps) {
  const texts = TEXT_MAP[variant];
  const isPendingRequest = following && isPrivate;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`follow-btn ${following ? "following" : ""} ${className}`}
    >
      {isPendingRequest ? (
        <><Clock className="h-3.5 w-3.5" /> İstek</>
      ) : following ? (
        <><Check className="h-3.5 w-3.5" /> {texts.following}</>
      ) : (
        <><UserPlus className="h-3.5 w-3.5" /> {texts.follow}</>
      )}
    </button>
  );
})
