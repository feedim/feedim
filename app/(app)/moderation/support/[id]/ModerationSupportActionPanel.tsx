"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PuzzleCaptcha from "@/components/PuzzleCaptcha";
import { feedimAlert } from "@/components/FeedimAlert";
import type { SupportReplyPreset } from "@/lib/supportReplyPresets";

type SupportAction = "await_user" | "resolve";

export default function ModerationSupportActionPanel({
  requestId,
  initialValue,
  presets,
  labels,
}: {
  requestId: number;
  initialValue: string;
  presets: SupportReplyPreset[];
  labels: {
    placeholder: string;
    awaitUserAction: string;
    resolveAction: string;
    actionHint: string;
    tryAgainLater: string;
    awaitUserSuccess: string;
    resolveSuccess: string;
  };
}) {
  const router = useRouter();
  const pendingActionRef = useRef<SupportAction | null>(null);
  const [note, setNote] = useState(initialValue);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<SupportAction | null>(null);

  const appendPreset = (preset: string) => {
    setNote((current) => {
      const trimmed = current.trim();
      if (!trimmed) return preset;
      if (trimmed.includes(preset)) return current;
      return `${trimmed}\n\n${preset}`;
    });
  };

  const openCaptcha = (action: SupportAction) => {
    if (!note.trim()) return;
    pendingActionRef.current = action;
    setCaptchaOpen(true);
  };

  const handleCaptchaVerify = async (_token: string) => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setCaptchaOpen(false);
    if (!action) return;

    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: requestId,
          action,
          reviewer_note: note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        feedimAlert("error", data.error || labels.tryAgainLater);
        return;
      }
      router.refresh();
    } catch {
      feedimAlert("error", labels.tryAgainLater);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <textarea
          rows={4}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={labels.placeholder}
          className="input-modern w-full resize-y !py-2 !text-[0.78rem]"
        />
        <div className="rounded-[10px] bg-bg-tertiary px-3 py-2 text-[0.72rem] leading-[1.5] text-text-muted">
          {labels.actionHint}
        </div>
        {presets.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => appendPreset(preset.body)}
                className="rounded-[12px] bg-bg-tertiary px-3 py-2.5 text-left transition hover:bg-bg-primary"
              >
                <div className="text-[0.72rem] font-semibold text-text-primary">{preset.label}</div>
                <div className="mt-0.5 line-clamp-2 text-[0.68rem] leading-[1.45] text-text-muted">{preset.body}</div>
              </button>
            ))}
          </div>
        ) : null}
        <span className="text-[0.65rem] text-text-muted">{note.length}/1000</span>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => openCaptcha("await_user")}
          disabled={actionLoading !== null || !note.trim()}
          className="px-3 py-1.5 rounded-[8px] bg-bg-tertiary text-text-primary hover:bg-bg-primary transition text-[0.78rem] font-medium whitespace-nowrap disabled:opacity-60"
        >
          {labels.awaitUserAction}
        </button>
        <button
          type="button"
          onClick={() => openCaptcha("resolve")}
          disabled={actionLoading !== null || !note.trim()}
          className="px-3 py-1.5 rounded-[8px] bg-success/10 text-success hover:bg-success/20 transition text-[0.78rem] font-medium whitespace-nowrap disabled:opacity-60"
        >
          {labels.resolveAction}
        </button>
      </div>

      <PuzzleCaptcha
        open={captchaOpen}
        onClose={() => {
          pendingActionRef.current = null;
          setCaptchaOpen(false);
        }}
        onVerify={handleCaptchaVerify}
      />
    </>
  );
}
