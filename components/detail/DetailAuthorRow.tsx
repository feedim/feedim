import type { ReactNode } from "react";
import Link from "next/link";
import LazyAvatar from "@/components/LazyAvatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import PostFollowButton from "@/components/PostFollowButton";

function getBadgeVariantServer(premiumPlan?: string | null): "default" | "max" {
  return premiumPlan === "max" || premiumPlan === "business" ? "max" : "default";
}

interface DetailAuthorRowProps {
  authorUsername?: string | null;
  authorUserId?: string | null;
  authorName: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  premiumPlan?: string | null;
  role?: string | null;
  secondaryLine?: ReactNode;
  usernameSuffix?: ReactNode;
  initialFollowing?: boolean;
  initialRequested?: boolean;
  initialFollowsMe?: boolean;
  followStateResolved?: boolean;
  compactFollow?: boolean;
  className?: string;
}

export default function DetailAuthorRow({
  authorUsername,
  authorUserId,
  authorName,
  avatarUrl,
  isVerified = false,
  premiumPlan,
  role,
  secondaryLine,
  usernameSuffix,
  initialFollowing = false,
  initialRequested = false,
  initialFollowsMe = false,
  followStateResolved = false,
  compactFollow = false,
  className = "flex items-center gap-2.5",
}: DetailAuthorRowProps) {
  const profileHref = authorUsername ? `/u/${authorUsername}` : "#";

  return (
    <div className={className}>
      <Link href={profileHref} className="shrink-0">
        <LazyAvatar src={avatarUrl} alt={authorName} sizeClass="h-10 w-10" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <Link href={profileHref} className="font-semibold text-[0.88rem] hover:underline truncate">
            @{authorUsername}
          </Link>
          {isVerified ? (
            <VerifiedBadge
              size="sm"
              className="h-[13px] w-[13px] min-w-[13px]"
              variant={getBadgeVariantServer(premiumPlan)}
              role={role || undefined}
            />
          ) : null}
          {usernameSuffix}
        </div>
        {secondaryLine}
      </div>
      {authorUsername && authorUserId ? (
        <PostFollowButton
          authorUsername={authorUsername}
          authorUserId={authorUserId}
          initialFollowing={initialFollowing}
          initialRequested={initialRequested}
          initialFollowsMe={initialFollowsMe}
          followStateResolved={followStateResolved}
          compact={compactFollow}
        />
      ) : null}
    </div>
  );
}
