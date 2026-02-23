"use client";

import Link from "next/link";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

export interface UserListItemUser {
  user_id: string;
  username: string;
  full_name?: string;
  name?: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
  bio?: string;
  mutual_count?: number;
}

interface UserListItemProps {
  user: UserListItemUser;
  /** Subtitle text (e.g. "2 ortak takip", relative date, bio) */
  subtitle?: string;
  /** Show mutual count or bio automatically */
  autoSubtitle?: boolean;
  /** Right side action (follow button, accept/reject, etc.) */
  action?: React.ReactNode;
  /** Called when user link is clicked (e.g. close modal) */
  onNavigate?: () => void;
  /** Avatar size variant */
  size?: "sm" | "md" | "lg";
}

const avatarSizes = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const nameSizes = {
  sm: "text-[0.82rem]",
  md: "text-sm",
  lg: "text-[0.9rem]",
};

export default function UserListItem({
  user,
  subtitle,
  autoSubtitle = false,
  action,
  onNavigate,
  size = "md",
}: UserListItemProps) {
  const displayName = user.full_name || user.name || user.username;
  const avatarSize = avatarSizes[size];
  const nameSize = nameSizes[size];

  const resolvedSubtitle = subtitle
    ? subtitle
    : autoSubtitle
      ? user.mutual_count && user.mutual_count > 0
        ? `${user.mutual_count} ortak takip`
        : user.bio || undefined
      : undefined;

  return (
    <div className="flex items-center gap-2 py-2 px-2 rounded-[14px] hover:bg-bg-secondary transition">
      <Link href={`/u/${user.username}`} onClick={onNavigate} className="shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className={`${avatarSize} rounded-full object-cover`}
            loading="lazy"
          />
        ) : (
          <img
            className={`default-avatar-auto ${avatarSize} rounded-full object-cover`}
            alt=""
            loading="lazy"
          />
        )}
      </Link>
      <Link href={`/u/${user.username}`} onClick={onNavigate} className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className={`${nameSize} font-semibold truncate hover:underline`}>{displayName}</p>
          {user.is_verified && (
            <VerifiedBadge variant={getBadgeVariant(user.premium_plan)} role={user.role} />
          )}
        </div>
        <p className="text-xs text-text-muted truncate">@{user.username}</p>
        {resolvedSubtitle && (
          <p className="text-[0.66rem] text-text-muted mt-0.5 line-clamp-1">{resolvedSubtitle}</p>
        )}
      </Link>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
