"use client";

import { feedimAlert } from "@/components/FeedimAlert";

type ConfirmDeleteDraftOptions = {
  draftId: number | null;
  deleting: boolean;
  setDeleting: (value: boolean) => void;
  confirmText: string;
  successText: string;
  failedText: string;
  onDeleted: () => void;
};

export function confirmDeleteDraft({
  draftId,
  deleting,
  setDeleting,
  confirmText,
  successText,
  failedText,
  onDeleted,
}: ConfirmDeleteDraftOptions) {
  if (!draftId || deleting) return;

  feedimAlert("question", confirmText, {
    showYesNo: true,
    onYes: async () => {
      setDeleting(true);
      try {
        const res = await fetch(`/api/posts/${draftId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("delete-failed");
        feedimAlert("success", successText);
        onDeleted();
      } catch {
        feedimAlert("error", failedText);
      } finally {
        setDeleting(false);
      }
    },
  });
}
