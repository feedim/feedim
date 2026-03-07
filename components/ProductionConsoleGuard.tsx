"use client";

import { useEffect } from "react";

type ConsoleMethod = "log" | "info" | "debug" | "warn" | "error";

const METHODS: ConsoleMethod[] = ["log", "info", "debug", "warn", "error"];

export default function ProductionConsoleGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;

    const originalConsole = window.console;
    const patchedConsole = { ...originalConsole };

    for (const method of METHODS) {
      patchedConsole[method] = () => undefined;
    }

    window.console = patchedConsole;

    return () => {
      window.console = originalConsole;
    };
  }, []);

  return null;
}
