"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LazyAvatar from "@/components/LazyAvatar";

export default function SupportReplyForm({
  requestId,
  avatarUrl,
  labels,
  disabled = false,
  disabledPlaceholder,
}: {
  requestId: number;
  avatarUrl?: string | null;
  labels: {
    replyPlaceholder: string;
    replySubmit: string;
    replySubmitting: string;
    tryAgainLater: string;
  };
  disabled?: boolean;
  disabledPlaceholder?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resizeTextarea = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "0";
    const scrollH = textarea.scrollHeight;
    const maxH = 200;
    if (scrollH > maxH) {
      textarea.style.height = `${maxH}px`;
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = `${scrollH}px`;
      textarea.style.overflowY = "hidden";
    }
  }, []);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [message, resizeTextarea]);

  const submit = async () => {
    if (disabled || submitting || message.trim().length < 1) return;
    setErrorMessage("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/support-requests/${requestId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.error || labels.tryAgainLater);
        return;
      }
      setMessage("");
      router.refresh();
    } catch {
      setErrorMessage(labels.tryAgainLater);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="w-full my-[10px] space-y-1.5"
      >
        <div className="flex items-end gap-2 w-full">
          <div className="shrink-0 mb-[7px]">
            <LazyAvatar src={avatarUrl} alt="" sizeClass="h-9 w-9" />
          </div>
          <div className="flex flex-1 min-w-0 items-stretch rounded-[24px] bg-bg-tertiary relative">
            <textarea
              ref={inputRef}
              rows={1}
              maxLength={2000}
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              onInput={resizeTextarea}
              placeholder={disabled ? (disabledPlaceholder || labels.replyPlaceholder) : labels.replyPlaceholder}
              disabled={disabled}
              className="comment-textarea flex-1 py-[13px] pl-[18px] pr-[78px] bg-transparent outline-none border-none shadow-none resize-none text-[0.9rem] min-h-[35px] max-h-[220px] text-text-readable placeholder:text-[0.9rem] placeholder:text-text-muted disabled:opacity-100 disabled:cursor-default"
            />
            {!disabled && message.length >= 100 ? (
              <span className="absolute right-[58px] top-1.5 text-[0.65rem] text-text-muted/50 pointer-events-none select-none">
                {message.length}/2000
              </span>
            ) : null}
            <div className="flex items-center shrink-0 mb-[9px] mt-auto mr-[7px]">
              <button
                type="submit"
                disabled={disabled || submitting || message.trim().length < 1}
                className="flex items-center justify-center relative h-[35px] w-auto min-w-[53px] rounded-[2rem] bg-bg-inverse text-bg-primary disabled:opacity-50 disabled:pointer-events-none transition shrink-0"
                aria-label={labels.replySubmit}
              >
                {submitting ? (
                  <span
                    className="loader"
                    style={{ width: 16, height: 16, borderTopColor: "var(--bg-primary)" }}
                  />
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 6V18M12 6L7 11M12 6L17 11"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        {errorMessage ? (
          <div className="pl-[48px] text-[0.72rem] font-medium text-error">
            {errorMessage}
          </div>
        ) : null}
      </form>
    </div>
  );
}
