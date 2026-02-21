"use client";

import { useState } from "react";
import { feedimAlert } from "@/components/FeedimAlert";
import Modal from "./Modal";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: "post" | "user" | "comment";
  targetId: string | number;
  /** Author user_id — for blocking after report */
  authorUserId?: string;
  /** Author display name — for block prompt */
  authorName?: string;
}

const reasons = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Taciz veya zorbalık" },
  { id: "hate", label: "Nefret söylemi" },
  { id: "violence", label: "Şiddet içerik" },
  { id: "nudity", label: "Uygunsuz içerik" },
  { id: "misinformation", label: "Yanlış bilgi" },
  { id: "copyright", label: "Telif hakkı ihlali" },
  { id: "other", label: "Diğer" },
];

export default function ReportModal({ open, onClose, targetType, targetId, authorUserId, authorName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: targetType,
          target_id: targetId,
          reason: selectedReason,
          description: description.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        feedimAlert("error", data.error || "Şikayet gönderilemedi");
        return;
      }
      setSubmitted(true);

      // After successful report, ask if user wants to block the author
      if (authorUserId) {
        setTimeout(() => {
          handleClose();
          setTimeout(() => {
            const name = authorName || "Bu kişi";
            feedimAlert("question", `${name} engellensin mi?`, {
              showYesNo: true,
              onYes: async () => {
                try {
                  await fetch("/api/blocks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blocked_id: authorUserId }),
                  });
                  feedimAlert("success", `${name} engellendi`);
                } catch {
                  feedimAlert("error", "Engellenemedi");
                }
              },
            });
          }, 300);
        }, 1500);
      }
    } catch {
      feedimAlert("error", "Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setDescription("");
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Şikayet Et" size="md" infoText="Uygunsuz içerikleri bildirerek topluluğun güvenliğine katkıda bulun.">
      <div className="px-4 py-4">
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold mb-2">Şikayetiniz alındı</p>
            <p className="text-sm text-text-muted">Ekibimiz en kısa sürede inceleyecektir.</p>
            <button onClick={handleClose} className="t-btn accept mt-6 px-8">Tamam</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-muted mb-4">Bu içeriği neden şikayet ediyorsunuz?</p>
            <div className="space-y-1.5">
              {reasons.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition text-left text-sm font-medium ${
                    selectedReason === r.id
                      ? "bg-accent-main/10 text-accent-main"
                      : "hover:bg-bg-tertiary text-text-primary"
                  }`}
                >
                  {r.label}
                  {selectedReason === r.id && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {selectedReason && (
              <div className="mt-4">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Ek açıklama (isteğe bağlı)"
                  maxLength={500}
                  rows={3}
                  className="input-modern w-full resize-none"
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedReason || submitting}
              className="t-btn accept w-full relative mt-4 disabled:opacity-40"
            >
              {submitting ? <span className="loader" style={{ width: 16, height: 16, borderTopColor: "#fff" }} /> : "Gönder"}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
