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
  const [submitted, setSubmitted] = useState(false);
  const [copyrightOwnerName, setCopyrightOwnerName] = useState("");
  const [copyrightEmail, setCopyrightEmail] = useState("");
  const [copyrightOriginalUrl, setCopyrightOriginalUrl] = useState("");

  const handleSubmit = async () => {
    if (!selectedReason || submitted) return;

    // Optimistic: show success immediately
    setSubmitted(true);

    // Capture payload before state resets
    const payload = {
      type: targetType,
      target_id: targetId,
      reason: selectedReason,
      description: description.trim() || null,
      ...(selectedReason === "copyright" ? {
        original_url: copyrightOriginalUrl.trim() || undefined,
        copy_url: typeof window !== "undefined" ? window.location.href : undefined,
        copyright_owner_name: copyrightOwnerName.trim() || undefined,
        copyright_email: copyrightEmail.trim() || undefined,
      } : {}),
    };
    const capturedAuthorUserId = authorUserId;
    const capturedAuthorName = authorName;

    // Fire-and-forget: send report in background
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then(res => {
      if (!res.ok) return;
      // After successful report, ask if user wants to block the author
      if (capturedAuthorUserId) {
        setTimeout(() => {
          handleClose();
          setTimeout(() => {
            const name = capturedAuthorName || "Bu kişi";
            feedimAlert("question", `${name} engellensin mi?`, {
              showYesNo: true,
              onYes: async () => {
                fetch("/api/blocks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ blocked_id: capturedAuthorUserId }),
                  keepalive: true,
                }).catch(() => {});
              },
            });
          }, 300);
        }, 1500);
      }
    }).catch(() => {});
  };

  const handleClose = () => {
    setSelectedReason("");
    setDescription("");
    setSubmitted(false);
    setCopyrightOwnerName("");
    setCopyrightEmail("");
    setCopyrightOriginalUrl("");
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Şikayet Et" size="md" infoText="Uygunsuz içerikleri bildirerek topluluğun güvenliğine katkıda bulun.">
      <div className="px-4 py-4">
        {submitted ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold mb-2">Şikayetiniz alındı</p>
            <p className="text-sm text-text-muted">Moderatör ekibimiz en kısa süre içerisinde inceleyecektir.</p>
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

            {selectedReason === "copyright" && (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Ad Soyad / Şirket Adı *</label>
                  <input
                    value={copyrightOwnerName}
                    onChange={e => setCopyrightOwnerName(e.target.value)}
                    className="input-modern w-full"
                    placeholder="Telif hakkı sahibinin adı"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">E-posta *</label>
                  <input
                    type="email"
                    value={copyrightEmail}
                    onChange={e => setCopyrightEmail(e.target.value)}
                    className="input-modern w-full"
                    placeholder="iletisim@sirket.com"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Orijinal İçerik Linki</label>
                  <input
                    value={copyrightOriginalUrl}
                    onChange={e => setCopyrightOriginalUrl(e.target.value)}
                    className="input-modern w-full"
                    placeholder="https://..."
                    maxLength={500}
                  />
                </div>
              </div>
            )}

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
              disabled={!selectedReason}
              className="t-btn accept w-full relative mt-4 disabled:opacity-40"
              aria-label="Şikayet Gönder"
            >
              Gönder
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
