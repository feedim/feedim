"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import { UserListSkeleton } from "@/components/Skeletons";
import { cn } from "@/lib/utils";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import FollowButton from "@/components/FollowButton";
import UserListItem from "@/components/UserListItem";
import { feedimAlert } from "@/components/FeedimAlert";

interface User {
  user_id: string;
  username: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  is_following?: boolean;
  is_requested?: boolean;
  account_private?: boolean;
  is_own?: boolean;
}

export interface FilterTab {
  key: string;
  label: string;
}

const DEFAULT_FILTER_TABS: FilterTab[] = [
  { key: "verified", label: "Doğrulanmış" },
  { key: "all", label: "Tümü" },
  { key: "following", label: "Takip Edilenler" },
];

export interface UserListModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  infoText: string;
  fetchUrl: string;
  emptyText: string;
  filterTabs?: FilterTab[];
}

export default function UserListModal({
  open,
  onClose,
  title,
  infoText,
  fetchUrl,
  emptyText,
  filterTabs = DEFAULT_FILTER_TABS,
}: UserListModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState(filterTabs[0]?.key || "all");
  const [tabSwitching, setTabSwitching] = useState(false);

  useEffect(() => {
    if (open) {
      setPage(1);
      setFilter(filterTabs[0]?.key || "all");
      loadUsers(1);
    }
  }, [open]);

  const loadUsers = async (pageNum: number) => {
    setLoading(true);
    try {
      const separator = fetchUrl.includes("?") ? "&" : "?";
      const res = await fetch(`${fetchUrl}${separator}page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setUsers(data.users || []);
      } else {
        setUsers(prev => [...prev, ...(data.users || [])]);
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (filter === "verified") return users.filter(u => u.is_verified);
    if (filter === "following") return users.filter(u => u.is_following || u.is_requested);
    return users;
  }, [users, filter]);

  const doFollow = async (targetUsername: string, userId: string) => {
    // Follow — optimistic update
    setToggling(prev => new Set(prev).add(userId));
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: true, is_requested: false } : u));

    try {
      const res = await fetch(`/api/users/${targetUsername}/follow`, { method: "POST" });
      if (!res.ok) {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: false, is_requested: false } : u));
      } else {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: data.following, is_requested: data.requested } : u));
      }
    } catch {
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: false, is_requested: false } : u));
    }
    setToggling(prev => { const s = new Set(prev); s.delete(userId); return s; });
  };

  const doUnfollow = async (targetUsername: string, userId: string) => {
    // Unfollow — wait for API before updating state (alert shows loader)
    try {
      const res = await fetch(`/api/users/${targetUsername}/follow`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_following: data.following, is_requested: data.requested } : u));
      }
    } catch {
      // Keep current state on error
    }
  };

  const handleFollow = (targetUsername: string, userId: string) => {
    const user = users.find(u => u.user_id === userId);
    if (user?.is_following || user?.is_requested) {
      feedimAlert("question", "Takibi bırakmak istiyor musunuz?", { showYesNo: true, onYes: () => doUnfollow(targetUsername, userId) });
      return;
    }
    doFollow(targetUsername, userId);
  };

  const filterEmptyText = (key: string) => {
    if (key === "verified") return "Doğrulanmış hesap yok";
    if (key === "following") return "Takip ettiğiniz kimse yok";
    return "Sonuç yok";
  };

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" infoText={infoText} centerOnDesktop fullHeight>
      {/* Filter tabs */}
      <div className="flex gap-0 px-2 border-b border-border-primary overflow-x-auto scrollbar-hide">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (tab.key === filter) return;
              setFilter(tab.key);
              setTabSwitching(true);
              setTimeout(() => setTabSwitching(false), 200);
            }}
            className={cn(
              "px-4 py-2.5 text-[0.88rem] font-bold whitespace-nowrap border-b-[2.5px] transition-colors",
              filter === tab.key
                ? "border-accent-main text-text-primary"
                : "border-transparent text-text-muted opacity-60 hover:opacity-100 hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="px-2 py-2 min-h-[300px]">
        {(loading && users.length === 0) || tabSwitching ? (
          <UserListSkeleton count={5} />
        ) : users.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">{emptyText}</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">
            {filterEmptyText(filter)}
          </p>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map(u => (
              <UserListItem
                key={u.user_id}
                user={u}
                onNavigate={onClose}
                action={!u.is_own ? (
                  <FollowButton
                    following={!!u.is_following || !!u.is_requested}
                    isPrivate={!!u.is_requested}
                    onClick={() => handleFollow(u.username, u.user_id)}
                    disabled={toggling.has(u.user_id)}
                  />
                ) : undefined}
              />
            ))}
            <LoadMoreTrigger onLoadMore={() => { setPage(p => p + 1); loadUsers(page + 1); }} loading={loading} hasMore={hasMore} />
          </div>
        )}
      </div>
    </Modal>
  );
}
