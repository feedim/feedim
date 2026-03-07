"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import NewTabLink from "@/components/NewTabLink";
import { feedimAlert } from "@/components/FeedimAlert";
import { copyTextToClipboard } from "@/lib/copyTextToClipboard";

interface Props {
  decisionCode: string | null;
  minimal?: boolean;
}

export default function ModerationContent({ decisionCode, minimal }: Props) {
  const t = useTranslations("moderation");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!decisionCode) return;
    const copiedOk = await copyTextToClipboard(decisionCode);
    if (!copiedOk) {
      feedimAlert("error", tc("genericError"));
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {decisionCode && (
        <div className="border border-border-primary rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted mb-0.5">{t("decisionCode")}</p>
            <p className="text-sm font-mono font-semibold">#{decisionCode}</p>
          </div>
          <button
            onClick={copyCode}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition text-text-muted"
            title={t("copy")}
          >
            {copied ? <Check size={14} className="text-[var(--accent-color)]" /> : <Copy size={14} />}
          </button>
        </div>
      )}
      {!minimal && (
        <>
          <p className="text-xs text-text-muted">
            {t("appealText")}
          </p>
          <NewTabLink href="/help/moderation" className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full">
            {t("learnMore")}
          </NewTabLink>
        </>
      )}
    </div>
  );
}
