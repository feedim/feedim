"use client";

import { X } from "lucide-react";
import LazyAvatar from "@/components/LazyAvatar";

export interface SavedAccountCardAccount {
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
}

interface SavedAccountCardProps {
  account: SavedAccountCardAccount;
  onSelect: () => void;
  onRemove: (event: React.MouseEvent<HTMLButtonElement>) => void;
  removeLabel: string;
  role?: "button" | "link";
}

export default function SavedAccountCard({
  account,
  onSelect,
  onRemove,
  removeLabel,
  role = "button",
}: SavedAccountCardProps) {
  return (
    <div
      role={role}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className="w-full flex items-center gap-3 p-2.5 rounded-[13.5px] border border-border-primary hover:bg-bg-tertiary transition cursor-pointer text-left group"
    >
      <LazyAvatar src={account.avatar_url} alt={account.username} sizeClass="w-10 h-10" className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">@{account.username}</p>
        <p className="text-xs text-text-muted truncate">{account.full_name}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-full hover:bg-bg-tertiary transition shrink-0"
        aria-label={removeLabel}
      >
        <X className="w-4 h-4 text-text-muted" />
      </button>
    </div>
  );
}
