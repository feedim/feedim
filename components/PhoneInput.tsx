"use client";

const DIAL_CODES = [
  { code: "+90", flag: "\u{1F1F9}\u{1F1F7}", label: "Türkiye", placeholder: "5XX XXX XX XX" },
  { code: "+994", flag: "\u{1F1E6}\u{1F1FF}", label: "Azərbaycan", placeholder: "XX XXX XX XX" },
  { code: "+1", flag: "\u{1F1FA}\u{1F1F8}", label: "USA / Canada", placeholder: "(XXX) XXX-XXXX" },
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
  const dialCode = parsed.dialCode;
  const number = parsed.number;

  const selected = DIAL_CODES.find(c => c.code === dialCode) || DIAL_CODES[0];

  const handleDialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    onChange(number ? `${code} ${number}` : "");
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9\s()-]/g, "");
    onChange(val ? `${dialCode} ${val}` : "");
  };

  return (
    <div
      className="relative flex items-center h-[50px] rounded-[14px] border-[1.5px] border-[var(--border-primary)] bg-transparent focus-within:border-[var(--text-muted)] transition"
    >
      {/* Native select for dial code */}
      <select
        value={dialCode}
        onChange={handleDialChange}
        className="appearance-none bg-transparent border-none outline-none pl-3.5 pr-1 h-full text-[0.82rem] font-semibold text-text-muted cursor-pointer"
      >
        {DIAL_CODES.map(c => (
          <option key={c.code} value={c.code}>
            {c.flag} {c.code}
          </option>
        ))}
      </select>

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
    </div>
  );
}
