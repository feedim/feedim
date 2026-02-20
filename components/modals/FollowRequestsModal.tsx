"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import { UserListSkeleton } from "@/components/Skeletons";
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
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Set<number>>(new Set());

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
    setProcessing(prev => new Set(prev).add(requestId));
    try {
      const res = await fetch(`/api/users/${username}/follow-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
      }
    } catch {
      // Silent
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(requestId); return s; });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Takip İstekleri" size="md" infoText="Gelen takip isteklerini buradan kabul edebilir veya reddedebilirsin.">
      <div className="px-4 py-3">
        {loading ? (
          <UserListSkeleton count={5} />
        ) : requests.length === 0 ? (
          <p className="text-center text-text-muted text-sm py-8">Bekleyen takip isteği yok</p>
        ) : (
          <div className="space-y-1">
            {requests.map(r => {
              const p = r.profile;
              if (!p) return null;
              const isProcessing = processing.has(r.id);

              return (
                <UserListItem
                  key={r.id}
                  user={p}
                  onNavigate={onClose}
                  action={
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAction(r.id, p.username, "accept")}
                        disabled={isProcessing}
                        className="t-btn bg-accent-main text-white"
                      >
                        {isProcessing ? <span className="loader" style={{ width: 14, height: 14 }} /> : "Kabul et"}
                      </button>
                      <button
                        onClick={() => handleAction(r.id, p.username, "reject")}
                        disabled={isProcessing}
                        className="t-btn bg-bg-tertiary text-text-muted hover:bg-error/10 hover:text-error"
                      >
                        Sil
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
