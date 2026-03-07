"use client";

import { useEffect } from "react";

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

const reported = new Set<string>();

function sendError(message: string, source?: string) {
  const hash = hashString(`${message}|${source || ""}`);
  if (reported.has(hash)) return;
  reported.add(hash);

  try {
    const payload = {
      error_hash: hash,
      message: message.slice(0, 2000),
      source: source?.slice(0, 500),
      url: window.location.pathname,
      user_agent: navigator.userAgent.slice(0, 500),
    };
    fetch("/api/error-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}

export default function ErrorLogCapture() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const msg = event.message || "Unknown error";
      const src = event.filename
        ? `${event.filename}:${event.lineno}:${event.colno}`
        : undefined;
      sendError(msg, src);
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection";
      const src = reason instanceof Error ? reason.stack?.split("\n")[1]?.trim().slice(0, 500) : undefined;
      sendError(msg, src);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  return null;
}
