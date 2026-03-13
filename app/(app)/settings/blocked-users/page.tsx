"use client";

import { useSearchParams } from "next/navigation";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import LazyAvatar from "@/components/LazyAvatar";
import { feedimAlert } from "@/components/FeedimAlert";
import AppLayout from "@/components/AppLayout";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import Link from "next/link";
import { useAuthModal } from "@/components/AuthModal";

const PAGE_SIZE = 10;

export default function BlockedUsersPage() {
  useSearchParams();
  const t = useTranslations("settings");
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const supabase = createClient();
  const { requireAuth } = useAuthModal();

  useEffect(() => {
    loadBlockedUsers(1);
  }, []);

  const loadBlockedUsers = async (pageNum: number) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const from = (pageNum - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: blocks } = await supabase
        .from("blocks")
        .select("id, blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!blocks) return;

      setHasMore(blocks.length >= PAGE_SIZE);

      if (blocks.length === 0) {
        if (pageNum === 1) setBlockedUsers([]);
        return;
      }

      const blockedIds = blocks.map((b: { blocked_id: string }) => b.blocked_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, full_name, avatar_url")
        .in("user_id", blockedIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const enriched = blocks.map((b: any) => ({ ...b, profile: profileMap.get(b.blocked_id) }));

      if (pageNum === 1) {
        setBlockedUsers(enriched);
      } else {
        setBlockedUsers(prev => {
          const existingIds = new Set(prev.map(b => b.id));
          return [...prev, ...enriched.filter((b: any) => !existingIds.has(b.id))];
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const handleUnblock = (username: string, blockId: number) => {
    feedimAlert("question", t("unblockConfirm", { username }), {
      showYesNo: true,
      onYes: async () => {
        setUnblockingId(blockId);
        try {
          const [res] = await Promise.all([
            fetch(`/api/users/${username}/block`, { method: "POST" }),
            new Promise(r => setTimeout(r, 2000)),
          ]);
          if (res.ok) {
            setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
          }
        } catch {
          feedimAlert("error", t("unblockFailed"));
        } finally {
          setUnblockingId(null);
        }
      },
    });
  };

  return (
    <AppLayout headerTitle={t("blockedUsersTitle")} hideRightSidebar>
      <div className="py-2">
        {loading ? (
          <div className="space-y-0 px-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="h-[40px] w-[40px] rounded-full bg-bg-secondary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-24 bg-bg-secondary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-16 bg-bg-secondary rounded-[5px] animate-pulse" />
                </div>
                <div className="h-[30px] w-[72px] bg-bg-secondary rounded-lg shrink-0 animate-pulse" />
              </div>
            ))}
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-sm text-text-muted">{t("noBlockedUsers")}</p>
          </div>
        ) : (
          <div className="px-4">
            <div className="space-y-1">
              {blockedUsers.map(b => (
                <div key={b.id} className="flex items-center gap-3 py-3">
                  <Link href={`/u/${b.profile?.username}`}>
                    <LazyAvatar src={b.profile?.avatar_url} alt="" sizeClass="w-10 h-10" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/u/${b.profile?.username}`} className="text-sm font-semibold truncate block hover:underline">
                      @{b.profile?.username || "?"}
                    </Link>
                    {b.profile?.full_name && (
                      <p className="text-xs text-text-muted truncate">{b.profile.full_name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => b.profile?.username && handleUnblock(b.profile.username, b.id)}
                    disabled={unblockingId === b.id}
                    className="t-btn cancel !h-[32px] !text-xs !px-3 shrink-0 min-w-[90px]"
                    aria-label={t("unblockUser")}
                  >
                    {unblockingId === b.id ? <span className="loader" style={{ width: 14, height: 14 }} /> : t("unblockUser")}
                  </button>
                </div>
              ))}
            </div>
            <LoadMoreTrigger
              onLoadMore={async () => {
                const user = await requireAuth();
                if (!user) return;
                const next = page + 1;
                setPage(next);
                loadBlockedUsers(next);
              }}
              loading={loadingMore}
              hasMore={hasMore}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
