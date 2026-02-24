"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Modal from "./Modal";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

import LoadMoreTrigger from "@/components/LoadMoreTrigger";

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
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (open) {
      setVisitors([]);
      setPage(1);
      loadVisitors(1);
    }
  }, [open]);

  const loadVisitors = async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${username}/visitors?page=${pageNum}`);
      const data = await res.json();
      if (pageNum === 1) {
        setVisitors(data.visitors || []);
      } else {
        setVisitors(prev => [...prev, ...(data.visitors || [])]);
      }
      setHasMore(data.hasMore || false);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Profil Ziyaretçileri" size="sm" infoText="Profilini son ziyaret eden kişiler burada gösterilir." centerOnDesktop>
      <div className="px-4 py-3">
        <p className="text-xs text-text-muted mb-3">Son 30 gün</p>

        {loading && visitors.length === 0 ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : visitors.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">Henüz ziyaretçi yok</p>
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
                    <img src={v.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <img className="default-avatar-auto h-10 w-10 rounded-full object-cover shrink-0" alt="" />
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
            <LoadMoreTrigger onLoadMore={() => { setPage(p => p + 1); loadVisitors(page + 1); }} loading={loading} hasMore={hasMore} />
          </div>
        )}
      </div>
    </Modal>
  );
}
