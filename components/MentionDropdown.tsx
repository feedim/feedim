"use client";

import LazyAvatar from "@/components/LazyAvatar";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

export interface MentionUser {
  user_id: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
}

interface MentionDropdownProps {
  users: MentionUser[];
  activeIndex: number;
  onSelect: (username: string) => void;
  onHover?: (index: number) => void;
  style?: React.CSSProperties;
  className?: string;
}

export default function MentionDropdown({ users, activeIndex, onSelect, onHover, style, className }: MentionDropdownProps) {
  if (users.length === 0) return null;

  return (
    <div
      className={`bg-bg-secondary border border-border-primary rounded-[13px] shadow-xs max-h-[200px] overflow-y-auto w-[260px] ${className || ""}`}
      style={{ position: "absolute" as const, zIndex: 50, left: 0, ...style }}
    >
      {users.map((u, i) => (
        <button
          key={u.user_id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u.username);
          }}
          onMouseEnter={() => onHover?.(i)}
          className={`w-full flex items-center px-4 py-[11px] text-left text-[0.82rem] transition ${
            i === activeIndex ? "bg-accent-main/10 text-accent-main" : "text-text-primary hover:bg-bg-tertiary"
          }`}
        >
          <LazyAvatar src={u.avatar_url} alt={u.username} sizeClass="h-7 w-7" borderClass="" className="shrink-0 mr-2.5" />
          <span className="font-medium truncate">@{u.username}</span>
          {u.is_verified && <span className="ml-1 shrink-0"><VerifiedBadge variant={getBadgeVariant(u.premium_plan)} role={u.role} /></span>}
        </button>
      ))}
    </div>
  );
}
