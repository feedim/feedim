"use client";

import { useState, useRef, useEffect } from "react";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";

interface VideoDescriptionProps {
  text: string;
}

export default function VideoDescription({ text }: VideoDescriptionProps) {
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
      className="mt-3 p-4 rounded-[10px] bg-bg-secondary cursor-pointer transition hover:bg-bg-secondary select-none"
      onCopy={(e) => e.preventDefault()}
      onClick={() => showToggle && setExpanded(!expanded)}
    >
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
          {expanded ? "daha az goster" : "devamini goster"}
        </button>
      )}
    </div>
  );
}
