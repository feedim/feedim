"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { feedimAlert } from "@/components/FeedimAlert";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import Modal from "./Modal";
import { useUser } from "@/components/UserContext";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  targetType: "post" | "user" | "comment";
  targetId: string | number;
  /** Author user_id — for blocking after report */
  authorUserId?: string;
  /** Author username — needed for block API */
  authorUsername?: string;
  /** Author display name — for block prompt */
  authorName?: string;
  /** Sponsored content cannot be reported */
  isSponsored?: boolean;
}

const reasonKeys = [
  { id: "spam", tKey: "spam" },
  { id: "harassment", tKey: "harassment" },
  { id: "hate", tKey: "hateSpeech" },
  { id: "violence", tKey: "violence" },
  { id: "nudity", tKey: "inappropriate" },
  { id: "misinformation", tKey: "misinformation" },
  { id: "copyright", tKey: "copyright" },
  { id: "other", tKey: "otherReason" },
] as const;

export default function ReportModal({ open, onClose, targetType, targetId, authorUserId, authorUsername, authorName, isSponsored }: ReportModalProps) {
  const t = useTranslations("modals");
  const tm = useTranslations("moderation");
  const tCopyright = useTranslations("copyright");
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  void authorUserId;
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [copyrightOwnerName, setCopyrightOwnerName] = useState("");
  const [copyrightEmail, setCopyrightEmail] = useState("");
  const [copyrightOriginalUrl, setCopyrightOriginalUrl] = useState("");
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason || submitted) return;
    if (isAdmin) {
      handleCaptchaVerify();
      return;
    }
    setCaptchaOpen(true);
  };

  const handleCaptchaVerify = () => {
    setCaptchaOpen(false);

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
    const capturedAuthorUsername = authorUsername;
    const capturedAuthorName = authorName;

    // Send report
    fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).then(res => {
      if (!res.ok) {
        // Revert optimistic update on failure
        setSubmitted(false);
        return;
      }
      // After successful report, ask if user wants to block the author
      if (capturedAuthorUsername) {
        setTimeout(() => {
          handleClose();
          setTimeout(() => {
            const name = capturedAuthorName || t("thisPerson");
            feedimAlert("question", t("blockConfirm", { name }), {
              showYesNo: true,
              onYes: async () => {
                try {
                  const res = await fetch(`/api/users/${encodeURIComponent(capturedAuthorUsername)}/block`, {
                    method: "POST",
                    keepalive: true,
                  });
                  if (!res.ok) feedimAlert("error", t("blockFailed"));
                } catch {
                  feedimAlert("error", t("blockFailed"));
                }
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
    <Modal open={open} onClose={handleClose} title={t("report")} size="md" infoText={t("reportInfoText")}>
      <div className="px-2.5 py-4">
        {isSponsored ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">{tm("sponsoredCannotReport")}</p>
            <button onClick={handleClose} className="t-btn accept mt-6 px-8">{t("ok")}</button>
          </div>
        ) : submitted ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold mb-2">{t("reportReceived")}</p>
            <p className="text-sm text-text-muted">{t("reportReviewMsg")}</p>
            <button onClick={handleClose} className="t-btn accept mt-6 px-8">{t("ok")}</button>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-text-primary mb-4">{t("whyReporting")}</p>
            <div className="space-y-1.5">
              {reasonKeys.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-[8px] transition text-left text-sm font-medium ${
                    selectedReason === r.id
                      ? "bg-accent-main/10 text-accent-main"
                      : "hover:bg-bg-tertiary text-text-primary"
                  }`}
                >
                  {t(r.tKey)}
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
                  <label className="text-xs text-text-muted mb-1 block">{t("copyrightOwnerName")}</label>
                  <input
                    value={copyrightOwnerName}
                    onChange={e => setCopyrightOwnerName(e.target.value)}
                    className="input-modern w-full"
                    placeholder={t("copyrightOwnerPlaceholder")}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">{t("emailLabel")}</label>
                  <input
                    type="email"
                    value={copyrightEmail}
                    onChange={e => setCopyrightEmail(e.target.value)}
                    className="input-modern w-full"
                    placeholder={tCopyright("placeholderCompanyEmail")}
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">{t("originalContentLink")}</label>
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
                  placeholder={t("additionalDescription")}
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
              aria-label={t("reportSubmit")}
            >
              {t("submit")}
            </button>
          </>
        )}
      </div>

      <PuzzleCaptcha open={captchaOpen} onClose={() => setCaptchaOpen(false)} onVerify={handleCaptchaVerify} />
    </Modal>
  );
}
