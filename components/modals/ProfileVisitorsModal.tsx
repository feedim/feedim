"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Modal from "./Modal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useAuthModal } from "@/components/AuthModal";
import LoadMoreTrigger from "@/components/LoadMoreTrigger";
import { useUser } from "@/components/UserContext";
import { fetchWithCache, readCache, withCacheScope } from "@/lib/fetchWithCache";
import { FRESHNESS_WINDOWS } from "@/lib/freshnessPolicy";

interface Visitor {
  user_id: string;
  name?: string;
  surname?: string;
  full_name?: string;
  username: string;
  avatar_url?: string;
  is_verified?: boolean;
  premium_plan?: string | null;
  role?: string;
  bio?: string;
}

interface ProfileVisitorsModalProps {
  open: boolean;
  onClose: () => void;
  username: string;
}

export default function ProfileVisitorsModal({ open, onClose, username }: ProfileVisitorsModalProps) {
  const t = useTranslations("modals");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { requireAuth } = useAuthModal();
  const { user: currentUser } = useUser();
  const requestUrl = withCacheScope(`/api/users/${username}/visitors?page=1`, currentUser?.id ? `viewer:${currentUser.id}` : "guest");

  useLayoutEffect(() => {
    if (!open) return;
    const cached = readCache(requestUrl) as { visitors?: Visitor[]; hasMore?: boolean } | null;
    if (cached?.visitors) {
      setVisitors(cached.visitors);
      setHasMore(cached.hasMore || false);
      setLoading(false);
    }
  }, [open, requestUrl]);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (open) {
      loadedRef.current = true;
      void loadVisitors(1);
    }
  }, [open]);

  const loadVisitors = async (pageNum: number) => {
    const url = withCacheScope(`/api/users/${username}/visitors?page=${pageNum}`, currentUser?.id ? `viewer:${currentUser.id}` : "guest");
    if (pageNum === 1) {
    } else {
      setLoading(true);
    }
    try {
      const data = await fetchWithCache(url, { ttlSeconds: FRESHNESS_WINDOWS.profileVisitors, forceRefresh: pageNum > 1 }) as {
        visitors?: Visitor[];
        hasMore?: boolean;
      };
      if (pageNum === 1) {
        setVisitors(data.visitors || []);
      } else {
        setVisitors(prev => {
          const existingIds = new Set(prev.map(v => v.user_id));
          return [...prev, ...(data.visitors || []).filter((v: Visitor) => !existingIds.has(v.user_id))];
        });
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("profileVisitors")} size="sm" infoText={t("profileVisitorsInfoText")} centerOnDesktop>
      <div className="px-4 py-3">
        <p className="text-xs text-text-muted mb-3">{t("last30DaysLabel")}</p>

        {loading && visitors.length === 0 ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="h-[40px] w-[40px] rounded-full bg-bg-tertiary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-24 bg-bg-tertiary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-16 bg-bg-tertiary rounded-[5px] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <p className="text-center text-text-muted text-[0.86rem] py-8">{t("noVisitors")}</p>
        ) : (
          <div className="space-y-3">
            {visitors.map(v => {
              const displayName = v.full_name || v.name || v.username;
              return (
                <Link
                  key={v.user_id}
                  href={`/u/${v.username}`}
                  onClick={onClose}
                  className="group flex items-center gap-3 py-2 hover:bg-bg-tertiary rounded-lg px-2 -mx-2 transition"
                >
                  {v.avatar_url ? (
                    <img suppressHydrationWarning data-src={v.avatar_url} alt="" className="lazyload h-10 w-10 rounded-full object-cover shrink-0 bg-bg-tertiary border border-border-primary" />
                  ) : (
                    <img className="default-avatar-auto bg-bg-tertiary h-10 w-10 rounded-full object-cover shrink-0 border border-border-primary" alt="" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold truncate group-hover:underline">{displayName}</p>
                      {v.is_verified && <VerifiedBadge variant={getBadgeVariant(v.premium_plan)} role={v.role} />}
                    </div>
                    <p className="text-xs text-text-muted truncate">@{v.username}</p>
                  </div>
                </Link>
              );
            })}
            <LoadMoreTrigger onLoadMore={async () => { const u = await requireAuth(); if (!u) return; const next = page + 1; setPage(next); loadVisitors(next); }} loading={loading} hasMore={hasMore} />
          </div>
        )}
      </div>
    </Modal>
  );
}
