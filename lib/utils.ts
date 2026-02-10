import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Türkçe sayı formatı: 1B, 10.5B, 100B, 1Mn vb.
 * B = Bin (thousand), Mn = Milyon (million)
 */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}B` : `${parseFloat(k.toFixed(1))}B`;
  }
  const m = n / 1_000_000;
  return m % 1 === 0 ? `${m}Mn` : `${parseFloat(m.toFixed(1))}Mn`;
}
