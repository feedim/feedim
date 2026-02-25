"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sun, Moon, Monitor } from "lucide-react";
import Modal from "./Modal";

interface DarkModeModalProps {
  open: boolean;
  onClose: () => void;
}

// Custom Dim icon — half-moon with lines
const DimIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    <path d="M19 3v4" />
    <path d="M21 5h-4" />
  </svg>
);

const themes = [
  { id: "light", tKey: "themeLight", descKey: "themeLightDesc", icon: Sun },
  { id: "dark", tKey: "themeDark", descKey: "themeDarkDesc", icon: Moon },
  { id: "dim", tKey: "themeDim", descKey: "themeDimDesc", icon: DimIcon },
  { id: "system", tKey: "themeSystem", descKey: "themeSystemDesc", icon: Monitor },
] as const;

export default function DarkModeModal({ open, onClose }: DarkModeModalProps) {
  const t = useTranslations("modals");
  const [current, setCurrent] = useState("system");

  useEffect(() => {
    if (open) {
      setCurrent(localStorage.getItem("fdm-theme") || "dark");
    }
  }, [open]);

  const themeColors: Record<string, string> = { light: "#ffffff", dark: "#090909", dim: "#0e1520" };

  const applyTheme = (themeId: string) => {
    setCurrent(themeId);
    localStorage.setItem("fdm-theme", themeId);
    let resolved = themeId;
    if (themeId === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", resolved);
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeColors[resolved] || "#ffffff");
  };

  return (
    <Modal open={open} onClose={onClose} title={t("appearanceTitle")} size="sm" infoText={t("appearanceInfoText")}>
      <div className="p-3 space-y-2">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isActive = current === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => applyTheme(theme.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-[10px] transition-all ${
                isActive
                  ? "bg-accent-main/10 text-accent-main"
                  : "hover:bg-bg-tertiary text-text-primary"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{t(theme.tKey)}</p>
                <p className="text-xs text-text-muted">{t(theme.descKey)}</p>
              </div>
              {isActive && (
                <div className="w-5 h-5 rounded-full bg-accent-main flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
