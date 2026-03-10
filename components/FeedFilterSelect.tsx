"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown } from "lucide-react";
import Modal from "@/components/modals/Modal";

export interface FeedFilterOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface FeedFilterSelectProps {
  value: string;
  options: FeedFilterOption[];
  onChange: (value: string) => void;
  modalTitle: string;
  variant?: "header" | "overlay-title";
  title?: string;
  overlayShowSubtitle?: boolean;
  overlayUseActiveLabelAsTitle?: boolean;
  overlayDefaultValue?: string;
}

export default function FeedFilterSelect({
  value,
  options,
  onChange,
  modalTitle,
  variant = "header",
  title,
  overlayShowSubtitle = true,
  overlayUseActiveLabelAsTitle = false,
  overlayDefaultValue,
}: FeedFilterSelectProps) {
  const [open, setOpen] = useState(false);

  const activeOption = useMemo(
    () => options.find((option) => option.id === value) || options[0],
    [options, value],
  );
  const overlayTitle = overlayUseActiveLabelAsTitle && activeOption
    ? value === overlayDefaultValue
      ? title
      : activeOption.label
    : title;

  const handleChange = (nextValue: string) => {
    setOpen(false);
    if (nextValue === value) return;
    onChange(nextValue);
  };

  return (
    <>
      {variant === "overlay-title" ? (
        <button
          onClick={() => setOpen(true)}
          className="pointer-events-auto flex flex-col items-center leading-none"
          aria-label={modalTitle}
        >
          <span
            className="inline-flex items-center gap-1.5"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}
          >
            <span className="text-white text-[1.08rem] font-bold">{overlayTitle}</span>
            <ChevronDown className="h-4 w-4 text-white/85" />
          </span>
          {overlayShowSubtitle ? (
            <span
              className="mt-0.5 text-[0.68rem] font-semibold text-white/70"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}
            >
              {activeOption?.label}
            </span>
          ) : null}
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold rounded-full bg-bg-secondary hover:bg-bg-elevated transition"
        >
          {activeOption?.label}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={modalTitle} size="sm">
        <div className="p-2 space-y-1">
          {options.map((option) => {
            const Icon = option.icon;
            const selected = value === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleChange(option.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-[14px] text-[0.88rem] font-medium transition hover:bg-bg-tertiary ${
                  selected ? "text-accent-main" : "text-text-primary"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {Icon ? <Icon className="h-[18px] w-[18px]" /> : null}
                  {option.label}
                </span>
                {selected ? <Check className="h-4.5 w-4.5 text-accent-main" /> : null}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
