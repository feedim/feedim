"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";

const DISMISS_KEY = "fdm-guest-join-prompt-dismissed";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7;

interface GuestJoinPromptProps {
  title: string;
  body: string;
  signupLabel: string;
  loginLabel: string;
  closeLabel: string;
  storageKey?: string;
}

export default function GuestJoinPrompt({
  title,
  body,
  signupLabel,
  loginLabel,
  closeLabel,
  storageKey = "default",
}: GuestJoinPromptProps) {
  const hydrated = useHydrated();
  const [visible, setVisible] = useState(false);
  const dismissKey = `${DISMISS_KEY}:${storageKey}`;

  useEffect(() => {
    if (!hydrated) return;
    try {
      const lastDismissed = Number(localStorage.getItem(dismissKey) || "0");
      if (lastDismissed > 0 && Date.now() - lastDismissed < DISMISS_TTL_MS) {
        setVisible(false);
        return;
      }
      if (lastDismissed > 0) localStorage.removeItem(dismissKey);
    } catch {}
    setVisible(true);
  }, [dismissKey, hydrated]);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(dismissKey, String(Date.now()));
    } catch {}
  };

  if (!hydrated || !visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[75] px-0">
      <div
        className="pointer-events-auto relative border-t border-black/10 shadow-[0_-14px_34px_rgba(0,0,0,0.14)]"
        style={{ backgroundColor: "var(--accent-color)" }}
      >
        <div className="mx-auto max-w-[1180px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] sm:px-5">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={closeLabel}
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center text-white/80 transition hover:text-white sm:right-3 sm:top-3 sm:h-8 sm:w-8"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          <div className="mx-auto max-w-[620px] px-10 text-center sm:px-0">
            <p className="text-[18px] font-extrabold leading-[1.2] text-white sm:text-[1.12rem]">{title}</p>
            <p className="mt-1.5 text-[0.8rem] font-medium leading-[1.45] text-white/88 sm:text-[0.83rem]">{body}</p>
          </div>

          <div className="mx-auto mt-3 flex w-full max-w-[420px] flex-col items-center justify-center gap-2.5 sm:max-w-none sm:flex-row">
            <Link href="/register" className="t-btn accept !w-full sm:!w-auto !px-6 !bg-white !text-[var(--accent-color)] hover:opacity-90">
              {signupLabel}
            </Link>
            <Link href="/login" className="t-btn cancel !w-full sm:!w-auto !px-6 !bg-white/10 !text-white hover:opacity-90">
              {loginLabel}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
