"use client";

import { memo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, Check, Clock } from "lucide-react";

interface FollowButtonProps {
  following: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** "default" = follow/followingShort, "profile" = follow/followingFull, "tag" = follow/followingTag */
  variant?: "default" | "profile" | "tag";
  /** When true and following, shows pending request text instead of follow text */
  isPrivate?: boolean;
  className?: string;
}

export default memo(function FollowButton({
  following,
  onClick,
  disabled,
  variant = "default",
  isPrivate,
  className = "",
}: FollowButtonProps) {
  const t = useTranslations("follow");
  const isPendingRequest = following && isPrivate;
  const [loading, setLoading] = useState(false);

  const followingTextMap = {
    default: t("followingShort"),
    profile: t("followingFull"),
    tag: t("followingTag"),
  };

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
          <><Clock className="h-3.5 w-3.5" /> {t("pendingRequest")}</>
        ) : following ? (
          <><Check className="h-3.5 w-3.5" /> {followingTextMap[variant]}</>
        ) : (
          <><UserPlus className="h-3.5 w-3.5" /> {t("follow")}</>
        )}
      </span>
    </button>
  );
})
