"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const DIAL_CODES = [
  { code: "+90", flag: "🇹🇷", label: "Türkiye", placeholder: "5XX XXX XX XX" },
  { code: "+994", flag: "🇦🇿", label: "Azərbaycan", placeholder: "XX XXX XX XX" },
  { code: "+1", flag: "🇺🇸", label: "USA / Canada", placeholder: "(XXX) XXX-XXXX" },
] as const;

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

function parsePhone(value: string): { dialCode: string; number: string } {
  const trimmed = value.trim();
  if (!trimmed) return { dialCode: "+90", number: "" };
  // Match longest dial codes first (+994 before +9)
  for (const { code } of [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length)) {
    if (trimmed.startsWith(code)) {
      return { dialCode: code, number: trimmed.slice(code.length).trimStart() };
    }
  }
  return { dialCode: "+90", number: trimmed };
}

export default function PhoneInput({ value, onChange, maxLength = 15 }: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [number, setNumber] = useState(parsed.number);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync from external value changes
  useEffect(() => {
    const p = parsePhone(value);
    setDialCode(p.dialCode);
    setNumber(p.number);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = DIAL_CODES.find(c => c.code === dialCode) || DIAL_CODES[0];

  const handleDialChange = (code: string) => {
    setDialCode(code);
    setOpen(false);
    onChange(number ? `${code} ${number}` : "");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9\s()-]/g, "");
    setNumber(val);
    onChange(val ? `${dialCode} ${val}` : "");
  };

  return (
    <div
      ref={wrapperRef}
      className="relative flex items-center h-[50px] rounded-[14px] border-[1.5px] border-[var(--border-primary)] bg-transparent focus-within:border-[var(--text-muted)] transition"
    >
      {/* Dial code selector */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 pl-3.5 pr-2 h-full shrink-0 cursor-pointer select-none"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-[0.82rem] font-semibold text-text-muted">{selected.code}</span>
        <ChevronDown className="h-3 w-3 text-text-muted" />
      </button>

      <div className="w-px h-6 bg-[var(--border-primary)] shrink-0" />

      {/* Phone number input */}
      <input
        type="tel"
        inputMode="tel"
        value={number}
        onChange={handleNumberChange}
        maxLength={maxLength}
        placeholder={selected.placeholder}
        className="flex-1 h-full bg-transparent border-none outline-none px-3 text-[0.93rem] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-lg z-50 min-w-[180px] overflow-hidden">
          {DIAL_CODES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleDialChange(c.code)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[0.88rem] transition ${
                c.code === dialCode ? "bg-[var(--bg-secondary)] font-semibold" : "hover:bg-[var(--bg-secondary)]"
              }`}
            >
              <span className="text-base">{c.flag}</span>
              <span>{c.label}</span>
              <span className="text-text-muted text-xs ml-auto">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
