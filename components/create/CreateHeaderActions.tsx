"use client";

import type { ReactNode } from "react";

interface CreateHeaderActionsProps {
  step: number;
  isPublished: boolean;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  stepOnePrefix?: ReactNode;
  saveLabel: string;
  onSaveDraft: () => void;
  saveDisabled?: boolean;
  saveLoading?: boolean;
  deleteLabel: string;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteLoading?: boolean;
  publishLabel: string;
  updateLabel: string;
  onPublish: () => void;
  publishDisabled?: boolean;
  publishLoading?: boolean;
}

export default function CreateHeaderActions({
  step,
  isPublished,
  nextLabel,
  onNext,
  nextDisabled = false,
  nextLoading = false,
  stepOnePrefix,
  saveLabel,
  onSaveDraft,
  saveDisabled = false,
  saveLoading = false,
  deleteLabel,
  onDelete,
  deleteDisabled = false,
  deleteLoading = false,
  publishLabel,
  updateLabel,
  onPublish,
  publishDisabled = false,
  publishLoading = false,
}: CreateHeaderActionsProps) {
  if (step === 1) {
    return (
      <div className="flex items-center gap-2">
        {stepOnePrefix}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="t-btn accept !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {nextLoading ? <span className="loader" style={{ width: 16, height: 16 }} /> : nextLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isPublished ? (
        <button
          onClick={onSaveDraft}
          disabled={saveDisabled}
          className="t-btn cancel relative !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
        >
          {saveLoading ? <span className="loader" style={{ width: 16, height: 16 }} /> : saveLabel}
        </button>
      ) : (
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          className="t-btn cancel relative !h-10 !px-5 !text-[0.82rem] !text-error disabled:opacity-40"
        >
          {deleteLoading ? <span className="loader" style={{ width: 16, height: 16 }} /> : deleteLabel}
        </button>
      )}
      <button
        onClick={onPublish}
        disabled={publishDisabled}
        className="t-btn accept relative !h-10 !px-5 !text-[0.82rem] disabled:opacity-40"
        aria-label={isPublished ? updateLabel : publishLabel}
      >
        {publishLoading ? <span className="loader" style={{ width: 16, height: 16 }} /> : isPublished ? updateLabel : publishLabel}
      </button>
    </div>
  );
}
