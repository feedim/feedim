"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

export type AlertType = "error" | "warning" | "info" | "success" | "question";

interface AlertOptions {
  showYesNo?: boolean;
  onYes?: () => void | Promise<void>;
  onNo?: () => void;
  showInput?: boolean;
  inputPlaceholder?: string;
  inputDefaultValue?: string;
  onSubmit?: (value: string) => void;
}

interface AlertState extends AlertOptions {
  id: number;
  type: AlertType;
  message: string;
}

// ── Global store ──
let alertCounter = 0;
let alerts: AlertState[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

function getSnapshot() {
  return alerts;
}

const SERVER_SNAPSHOT: AlertState[] = [];
function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function addAlert(a: AlertState) {
  if (alerts.some((x) => x.message === a.message && !a.showYesNo && !a.showInput)) return;
  alerts = [...alerts, a];
  emit();
}

function removeAlert(id: number) {
  alerts = alerts.filter((a) => a.id !== id);
  emit();
}

/** Global feedimAlert — call from anywhere */
export function feedimAlert(type: AlertType, message: string, options?: AlertOptions) {
  if (!message) return;
  const id = ++alertCounter;
  addAlert({ id, type, message, ...options });
}

/** Promise-based prompt — returns entered value or null if cancelled */
export function feedimPrompt(message: string, defaultValue?: string, placeholder?: string): Promise<string | null> {
  return new Promise((resolve) => {
    feedimAlert("question", message, {
      showInput: true,
      inputPlaceholder: placeholder || "",
      inputDefaultValue: defaultValue || "",
      onSubmit: (value) => resolve(value),
      onNo: () => resolve(null),
    });
  });
}

// Attach to window
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).feedimAlert = feedimAlert;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).feedimPrompt = feedimPrompt;
}

/** Alert Provider — mount once in root layout */
export default function FeedimAlertProvider() {
  const currentAlerts = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mounted, setMounted] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setMounted(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).feedimAlert = feedimAlert;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).feedimPrompt = feedimPrompt;
  }, []);

  // Scroll lock when any alert is visible
  useEffect(() => {
    if (currentAlerts.length > 0) {
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      return () => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [currentAlerts.length > 0]);

  const handleClose = useCallback((a: AlertState) => {
    a.onNo?.();
    removeAlert(a.id);
  }, []);

  const handleYes = useCallback(async (a: AlertState) => {
    if (!a.onYes) { removeAlert(a.id); return; }
    const result = a.onYes();
    if (result && typeof (result as Promise<void>).then === "function") {
      setLoadingIds((prev) => new Set(prev).add(a.id));
      try {
        await result;
      } catch {}
      setLoadingIds((prev) => { const next = new Set(prev); next.delete(a.id); return next; });
    }
    removeAlert(a.id);
  }, []);

  const handleNo = useCallback((a: AlertState) => { a.onNo?.(); removeAlert(a.id); }, []);

  useEffect(() => {
    if (currentAlerts.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      const last = currentAlerts[currentAlerts.length - 1];
      if (!last) return;
      // Block keyboard when loading
      if (loadingIds.has(last.id)) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (last.showInput) {
          handleNo(last);
        } else {
          last.showYesNo ? handleNo(last) : handleClose(last);
        }
      }
      // Don't handle Enter for input mode (handled by InputAlert component)
      if (e.key === "Enter" && !last.showInput) {
        e.preventDefault();
        e.stopPropagation();
        last.showYesNo ? handleYes(last) : handleClose(last);
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [currentAlerts, loadingIds, handleClose, handleYes, handleNo]);

  if (!mounted || currentAlerts.length === 0) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[2147483646] bg-black/50 transition-opacity duration-200"
        onClick={() => {
          const last = currentAlerts[currentAlerts.length - 1];
          if (last && !loadingIds.has(last.id)) handleClose(last);
        }}
        style={{ animation: "fadeIn 0.2s ease" }}
      />
      {currentAlerts.map((alert) => {
        const isLoading = loadingIds.has(alert.id);
        return (
          <div
            key={alert.id}
            className="fixed inset-0 z-[2147483647] flex items-center justify-center pointer-events-none"
          >
            <div
              data-modal
              className="pointer-events-auto max-w-[350px] w-[calc(100%-32px)] rounded-[27px] p-[9px_15px_15px] bg-bg-secondary border border-border-overlay select-none"
              style={{ animation: "scaleIn 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) both" }}
            >
              <div className="flex items-center gap-2 h-11 px-1">
                <span className="text-[1.1rem] font-bold flex-1">
                  {alert.showInput ? alert.message : "Bildirim"}
                </span>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-text-primary shrink-0">
                  <path d="M12 8H12.01M12 11V16M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {!alert.showInput && (
                <div className="mx-[7px] mb-[14px] text-[0.74rem] leading-[1.5] text-text-primary/85 font-medium">
                  {alert.message}
                </div>
              )}
              {alert.showInput ? (
                <div className="mt-1">
                  <InputAlert alert={alert} onSubmit={(val) => { alert.onSubmit?.(val); removeAlert(alert.id); }} onCancel={() => handleNo(alert)} />
                </div>
              ) : alert.showYesNo ? (
                <div className="flex gap-2">
                  <button onClick={() => handleNo(alert)} disabled={isLoading} className="t-btn cancel flex-1 !h-[42px] !text-[0.84rem] disabled:opacity-50">
                    Hayır
                  </button>
                  <button onClick={() => handleYes(alert)} disabled={isLoading} className="t-btn accept flex-1 !h-[42px] !text-[0.84rem] disabled:opacity-50">
                    {isLoading ? <span className="loader" style={{ width: 16, height: 16, borderColor: "rgba(0,0,0,0.15)", borderTopColor: "#000" }} /> : "Evet"}
                  </button>
                </div>
              ) : (
                <button onClick={() => handleClose(alert)} className="t-btn accept w-full !h-[42px] !text-[0.84rem]">
                  Tamam
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>,
    document.body
  );
}

function InputAlert({ alert, onSubmit, onCancel }: { alert: AlertState; onSubmit: (val: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(alert.inputDefaultValue || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (value.trim()) onSubmit(value.trim());
    }
  };

  return (
    <div className="space-y-2.5">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={alert.inputPlaceholder}
        className="input-modern w-full text-[0.84rem]"
        autoFocus
      />
      <div className="flex gap-2">
        <button onClick={onCancel} className="t-btn cancel flex-1 !h-[42px] !text-[0.84rem]">
          Vazgeç
        </button>
        <button
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim()}
          className="t-btn accept flex-1 !h-[42px] !text-[0.84rem] disabled:opacity-50"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
