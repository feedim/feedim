"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface CreateSettingsSectionProps {
  label: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  lockedMessage?: string;
  children: ReactNode;
}

export default function CreateSettingsSection({
  label,
  description,
  expanded,
  onToggle,
  lockedMessage,
  children,
}: CreateSettingsSectionProps) {
  return (
    <div>
      <div className="cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center justify-between w-full text-left">
          <span className="block text-sm font-semibold">{label}</span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
        {lockedMessage ? <p className="text-xs text-text-muted mt-1.5">{lockedMessage}</p> : null}
        <p className="text-[0.7rem] text-text-muted/60 leading-relaxed mt-1.5">{description}</p>
      </div>
      {expanded ? <div className="space-y-1 mt-3">{children}</div> : null}
    </div>
  );
}
