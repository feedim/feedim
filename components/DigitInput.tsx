"use client";

import { useRef, useState, useEffect } from "react";

interface DigitInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function DigitInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  ariaLabel = "Verification code",
}: DigitInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const activeIndex = focused && !disabled ? Math.min(value.length, length - 1) : -1;
  const sanitizeDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, length);

  return (
    <div
      className={`relative my-3 mx-[5px] ${disabled ? "opacity-70" : "cursor-text"}`}
      onClick={() => { if (!disabled) inputRef.current?.focus(); }}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(sanitizeDigits(e.target.value))}
        onPaste={(e) => {
          e.preventDefault();
          const pasted = e.clipboardData?.getData("text") ?? "";
          onChange(sanitizeDigits(pasted));
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 z-10"
        aria-label={ariaLabel}
      />
      <div className="flex gap-[10px] select-none pointer-events-none">
        {Array.from({ length }, (_, i) => {
          const isActiveSlot = i === activeIndex;
          const showCaret = isActiveSlot && value.length < length;
          return (
            <div
              key={i}
              className={`flex-1 h-[60px] flex items-end justify-center pb-[9px] border-b-2 transition-colors ${
                isActiveSlot
                  ? "border-accent-main"
                  : "border-border-primary"
              }`}
            >
              <span className="inline-flex h-[2.18rem] items-end justify-center text-[2.18rem] leading-none font-semibold">
                {value[i] ? (
                  value[i]
                ) : showCaret ? (
                  <span
                    className="inline-block h-[1.95rem] w-[2px] rounded-full bg-accent-main animate-pulse"
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
