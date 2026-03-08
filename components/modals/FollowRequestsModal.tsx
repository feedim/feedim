"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Modal from "./Modal";
import { feedimAlert } from "@/components/FeedimAlert";

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
  username?: string;
}

export default function FollowRequestsModal({ open, onClose, username: usernameProp }: FollowRequestsModalProps) {
  const t = useTranslations("modals");
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const uname = usernameProp;
      if (!uname) return;

      const reqRes = await fetch(`/api/users/${uname}/follow-request`);
      const data = await reqRes.json();
      setRequests(data.requests || []);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [usernameProp]);

  useEffect(() => {
    if (open) loadRequests();
  }, [open, loadRequests]);

  const doAction = async (requestId: number, username: string, action: "accept" | "reject") => {
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
        setRequests(prev => [...prev, removed]);
      }
    } catch {
      if (removed) setRequests(prev => [...prev, removed]);
    }
  };

  const handleAction = (requestId: number, username: string, action: "accept" | "reject") => {
    if (action === "reject") {
      feedimAlert("question", t("rejectFollowConfirm", { username }), {
        showYesNo: true,
        onYes: () => doAction(requestId, username, action),
      });
      return;
    }
    doAction(requestId, username, action);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("followRequests")} size="md" infoText={t("followRequestsInfoText")}>
      <div className="px-2 py-3">
        {loading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                <div className="h-[40px] w-[40px] rounded-full bg-bg-tertiary shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0 space-y-[6px]">
                  <div className="h-[9px] w-24 bg-bg-tertiary rounded-[5px] animate-pulse" />
                  <div className="h-[9px] w-16 bg-bg-tertiary rounded-[5px] animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-[30px] w-[56px] bg-bg-tertiary rounded-full shrink-0 animate-pulse" />
                  <div className="h-[30px] w-[38px] bg-bg-tertiary rounded-full shrink-0 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-center text-text-muted text-[0.86rem] py-8">{t("noFollowRequestsPending")}</p>
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
                        className="h-[30px] px-3.5 rounded-full text-[0.76rem] font-semibold bg-accent-main text-white hover:opacity-85 active:opacity-85 transition shrink-0 cursor-pointer select-none"
                        aria-label={t("acceptRequest")}
                      >
                        {t("acceptRequest")}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, p.username, "reject")}
                        className="h-[30px] px-3 rounded-full text-[0.76rem] font-semibold bg-bg-tertiary text-text-muted hover:bg-error/10 hover:text-error transition shrink-0 cursor-pointer select-none"
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
