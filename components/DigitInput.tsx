"use client";

import { useRef, useState, useEffect } from "react";

interface DigitInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function DigitInput({
  value,
  onChange,
  length = 8,
  autoFocus = false,
  disabled = false,
}: DigitInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="relative my-3" onClick={() => inputRef.current?.focus()}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={length}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 z-10"
        aria-label="Verification code"
      />
      <div className="flex gap-[5px] select-none pointer-events-none">
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            className={`flex-1 aspect-square max-h-14 flex items-center justify-center text-[1.4rem] sm:text-2xl font-bold rounded-[9px] border-[1.5px] transition-colors ${
              focused && i === value.length
                ? "border-accent-main bg-accent-main/5"
                : "border-border-primary bg-bg-secondary"
            }`}
          >
            {value[i] || ""}
          </div>
        ))}
      </div>
    </div>
  );
}
