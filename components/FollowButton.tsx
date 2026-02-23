"use client";

import { memo, useState, useCallback } from "react";
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
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(() => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      onClick();
      setLoading(false);
    }, 1000);
  }, [loading, onClick]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`follow-btn relative ${following ? "following" : ""} ${className}`}
    >
      {loading && <span className="loader" style={{ width: 14, height: 14, borderWidth: 2 }} />}
      <span className={`inline-flex items-center gap-[5px] ${loading ? "invisible" : ""}`}>
        {isPendingRequest ? (
          <><Clock className="h-3.5 w-3.5" /> İstek</>
        ) : following ? (
          <><Check className="h-3.5 w-3.5" /> {texts.following}</>
        ) : (
          <><UserPlus className="h-3.5 w-3.5" /> {texts.follow}</>
        )}
      </span>
    </button>
  );
})
