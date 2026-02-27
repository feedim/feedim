"use client";

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
  style?: React.CSSProperties;
  className?: string;
}

export default function MentionDropdown({ users, activeIndex, onSelect, style, className }: MentionDropdownProps) {
  if (users.length === 0) return null;

  return (
    <div
      className={`bg-bg-elevated bg-solid border border-border-primary rounded-md shadow-xl max-h-[200px] overflow-y-auto z-50 ${className || ""}`}
      style={style}
    >
      {users.map((u, i) => (
        <button
          key={u.user_id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(u.username);
          }}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition text-sm first:rounded-t-md last:rounded-b-md ${
            i === activeIndex ? "bg-accent-main/10" : "hover:bg-bg-tertiary"
          }`}
        >
          {u.avatar_url ? (
            <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
          ) : (
            <img className="default-avatar-auto h-7 w-7 rounded-full object-cover shrink-0" alt="" />
          )}
          <span className="font-medium">@{u.username}</span>
          {u.is_verified && <VerifiedBadge variant={getBadgeVariant(u.premium_plan)} role={u.role} />}
        </button>
      ))}
    </div>
  );
}
