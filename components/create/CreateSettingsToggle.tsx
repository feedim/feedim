"use client";

import type { ReactNode } from "react";

interface CreateSettingsToggleProps {
  label: string;
  description: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  paddingClassName?: string;
  disabledClassName?: string;
}

export default function CreateSettingsToggle({
  label,
  description,
  checked,
  disabled = false,
  onToggle,
  paddingClassName = "px-3 py-3",
  disabledClassName = "opacity-60 cursor-not-allowed",
}: CreateSettingsToggleProps) {
  return (
    <button
      disabled={disabled}
      onClick={onToggle}
      className={`w-full flex items-center justify-between rounded-lg transition text-left ${paddingClassName} ${
        disabled ? disabledClassName : "hover:bg-bg-tertiary"
      }`}
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
      <div className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${checked ? "bg-accent-main" : "bg-border-primary"}`}>
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-transform ${checked ? "left-[22px]" : "left-[3px]"}`} />
      </div>
    </button>
  );
}
