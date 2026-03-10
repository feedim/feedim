"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";

interface ExpandableTextProps {
  text: string;
  maxChars?: number;
  maxLines?: number;
  className?: string;
  buttonClassName?: string;
  collapseButtonClassName?: string;
  htmlRenderer?: (text: string) => string;
  defaultExpanded?: boolean;
  showCollapseButton?: boolean;
  onReadMore?: () => void;
}

function buildCollapsedText(text: string, maxChars: number, maxLines: number) {
  const normalized = (text || "").replace(/\r\n?/g, "\n").trimEnd();
  const lines = normalized.split("\n");
  let next = normalized;
  let truncated = false;

  if (lines.length > maxLines) {
    next = lines.slice(0, maxLines).join("\n").trimEnd();
    truncated = true;
  }

  const chars = Array.from(next);
  if (chars.length > maxChars) {
    next = chars.slice(0, maxChars).join("").trimEnd();
    truncated = true;
  }

  return { text: next, truncated };
}

export default function ExpandableText({
  text,
  maxChars = 280,
  maxLines = 5,
  className,
  buttonClassName,
  collapseButtonClassName,
  htmlRenderer,
  defaultExpanded = false,
  showCollapseButton = false,
  onReadMore,
}: ExpandableTextProps) {
  const t = useTranslations("common");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [measuredOverflow, setMeasuredOverflow] = useState(false);

  const normalizedText = useMemo(
    () => (text || "").replace(/\r\n?/g, "\n").trimEnd(),
    [text],
  );
  const collapsed = useMemo(
    () => buildCollapsedText(normalizedText, maxChars, maxLines),
    [normalizedText, maxChars, maxLines],
  );
  const hasInlineTruncation = collapsed.truncated && collapsed.text !== normalizedText;

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [normalizedText, maxChars, maxLines, defaultExpanded]);

  useEffect(() => {
    if (expanded || hasInlineTruncation) {
      setMeasuredOverflow(false);
      return;
    }

    const el = contentRef.current;
    if (!el) return;
    setMeasuredOverflow(el.scrollHeight > el.clientHeight + 1);
  }, [expanded, hasInlineTruncation, normalizedText, maxLines]);

  if (!normalizedText) return null;

  const renderContent = (value: string) => {
    if (htmlRenderer) {
      return <span dangerouslySetInnerHTML={{ __html: htmlRenderer(value) }} />;
    }
    return value;
  };

  const textClasses = `${className || ""} break-words [overflow-wrap:anywhere]`;
  const handleReadMore = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (onReadMore) {
      onReadMore();
      return;
    }
    setExpanded(true);
  };

  if (!expanded && hasInlineTruncation) {
    return (
      <div className={textClasses}>
        {renderContent(collapsed.text)}
        <span aria-hidden="true">... </span>
        <button
          type="button"
          onClick={handleReadMore}
          className={buttonClassName || "font-bold text-text-muted hover:underline"}
          aria-expanded={expanded}
        >
          {t("readMoreShort")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={contentRef}
        className={textClasses}
        style={!expanded ? {
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: maxLines,
          overflow: "hidden",
        } : undefined}
      >
        {renderContent(normalizedText)}
      </div>
      {!expanded && measuredOverflow && (
        <button
          type="button"
          onClick={handleReadMore}
          className={buttonClassName || "mt-0.5 font-bold text-text-muted hover:underline"}
          aria-expanded={expanded}
        >
          {t("readMoreShort")}
        </button>
      )}
      {expanded && showCollapseButton && (hasInlineTruncation || measuredOverflow || collapsed.truncated) && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(false);
          }}
          className={collapseButtonClassName || buttonClassName || "mt-0.5 font-bold text-text-muted hover:underline"}
          aria-expanded={expanded}
        >
          {t("showLess")}
        </button>
      )}
    </div>
  );
}
