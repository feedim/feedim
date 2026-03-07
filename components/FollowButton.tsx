"use client";

import { memo } from "react";
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

  const followingTextMap = {
    default: t("followingShort"),
    profile: t("followingFull"),
    tag: t("followingTag"),
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={following}
      aria-label={isPendingRequest ? t("pendingRequest") : following ? followingTextMap[variant] : t("follow")}
      className={`follow-btn relative select-none ${following ? "following" : ""} ${className}`}
    >
      <span className="inline-flex items-center gap-[5px]">
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
