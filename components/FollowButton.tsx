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
  /** When true and not following, shows "follows you" label */
  followsMe?: boolean;
  className?: string;
}

export default memo(function FollowButton({
  following,
  onClick,
  disabled,
  variant = "default",
  isPrivate,
  followsMe,
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
    onClick();
    setLoading(true);
    setTimeout(() => setLoading(false), 250);
  }, [loading, onClick]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      aria-label={isPendingRequest ? t("pendingRequest") : following ? followingTextMap[variant] : t("follow")}
      className={`follow-btn relative ${following ? "following" : ""} ${className}`}
    >
      {loading && <span className="loader" style={{ width: 18, height: 18, borderWidth: 2 }} />}
      <span className={`inline-flex items-center gap-[5px] ${loading ? "invisible" : ""}`}>
        {isPendingRequest ? (
          <><Clock className="h-3.5 w-3.5" /> {t("pendingRequest")}</>
        ) : following ? (
          <><Check className="h-3.5 w-3.5" /> {followingTextMap[variant]}</>
        ) : followsMe ? (
          <><UserPlus className="h-3.5 w-3.5" /> {t("followBack")}</>
        ) : (
          <><UserPlus className="h-3.5 w-3.5" /> {t("follow")}</>
        )}
      </span>
    </button>
  );
})
