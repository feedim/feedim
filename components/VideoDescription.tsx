"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";

interface VideoDescriptionProps {
  text: string;
}

export default function VideoDescription({ text }: VideoDescriptionProps) {
  const t = useTranslations("common");
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // Show toggle if content exceeds 3 lines (~60px)
    setShowToggle(el.scrollHeight > 72);
  }, [text]);

  return (
    <div
      className="mt-3 p-4 rounded-[12px] bg-bg-secondary cursor-pointer transition hover:bg-bg-secondary select-none"
      onCopy={(e) => e.preventDefault()}
      onClick={() => showToggle && setExpanded(!expanded)}
    >
      <span className="text-[0.88rem] font-bold block mb-2">{t("description")}</span>
      <div
        ref={contentRef}
        className={`text-[0.88rem] leading-[1.65] text-text-readable whitespace-pre-wrap ${
          expanded ? "" : "line-clamp-3"
        }`}
        dangerouslySetInnerHTML={{ __html: renderMentionsAsHTML(text) }}
      />
      {showToggle && (
        <button
          className="text-[0.82rem] font-semibold text-text-primary mt-1.5 hover:underline"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? t("showLess") : t("readMoreShort")}
        </button>
      )}
    </div>
  );
}
