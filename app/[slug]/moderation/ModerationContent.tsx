"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface Props {
  decisionCode: string | null;
  minimal?: boolean;
}

export default function ModerationContent({ decisionCode, minimal }: Props) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!decisionCode) return;
    navigator.clipboard.writeText(decisionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {decisionCode && (
        <div className="border border-border-primary rounded-lg p-3">
          <p className="text-xs text-text-muted">Karar No</p>
          <div className="flex items-center justify-between mt-0.5">
            <p className="text-sm font-mono font-semibold">#{decisionCode}</p>
            <button
              onClick={copyCode}
              className="p-1.5 rounded-lg hover:bg-bg-tertiary transition text-text-muted"
              title="Kopyala"
            >
              {copied ? <Check size={14} className="text-[var(--accent-color)]" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}
      {!minimal && (
        <>
          <p className="text-xs text-text-muted">
            İçerik insan moderasyon ekibimiz tarafından kontrol edildi. Karar no ile <span className="font-medium text-text-primary">www.feedim.com/help/</span> adresi üzerinden itiraz talebi oluşturabilirsiniz.
          </p>
          <Link href="/help/moderation" className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full">
            Daha fazla bilgi
          </Link>
        </>
      )}
    </div>
  );
}
