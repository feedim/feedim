"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Modal from "./Modal";


import UserListItem from "@/components/UserListItem";

interface FollowRequest {
  id: number;
  requester_id: string;
  created_at: string;
  profile: {
    user_id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
  } | null;
}

interface FollowRequestsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FollowRequestsModal({ open, onClose }: FollowRequestsModalProps) {
  const t = useTranslations("modals");
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) loadRequests();
  }, [open]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Use the current user's username — we need to fetch it
      const res = await fetch("/api/profile");
      const profileData = await res.json();
      if (!profileData.profile) return;

      const reqRes = await fetch(`/api/users/${profileData.profile.username}/follow-request`);
      const data = await reqRes.json();
      setRequests(data.requests || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: number, username: string, action: "accept" | "reject") => {
    // Optimistic: remove from list immediately
    const removed = requests.find(r => r.id === requestId);
    setRequests(prev => prev.filter(r => r.id !== requestId));

    try {
      const res = await fetch(`/api/users/${username}/follow-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        keepalive: true,
      });
      if (!res.ok && removed) {
        // Rollback on failure
        setRequests(prev => [...prev, removed]);
      }
    } catch {
      // Rollback on error
      if (removed) setRequests(prev => [...prev, removed]);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("followRequests")} size="md" infoText={t("followRequestsInfoText")}>
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-8"><span className="loader" style={{ width: 22, height: 22 }} /></div>
        ) : requests.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">{t("noFollowRequestsPending")}</p>
        ) : (
          <div className="space-y-1">
            {requests.map(r => {
              const p = r.profile;
              if (!p) return null;

              return (
                <UserListItem
                  key={r.id}
                  user={p}
                  onNavigate={onClose}
                  action={
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAction(r.id, p.username, "accept")}
                        className="t-btn bg-accent-main text-white"
                        aria-label={t("acceptRequest")}
                      >
                        {t("acceptRequest")}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, p.username, "reject")}
                        className="t-btn bg-bg-tertiary text-text-muted hover:bg-error/10 hover:text-error"
                      >
                        {t("deleteRequest")}
                      </button>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
