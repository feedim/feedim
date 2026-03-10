"use client";

import ExpandableText from "@/components/ExpandableText";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";

interface ExpandableMentionTextProps {
  text: string;
  maxChars?: number;
  maxLines?: number;
  className?: string;
  buttonClassName?: string;
  collapseButtonClassName?: string;
  defaultExpanded?: boolean;
  showCollapseButton?: boolean;
}

export default function ExpandableMentionText({
  text,
  maxChars,
  maxLines,
  className,
  buttonClassName,
  collapseButtonClassName,
  defaultExpanded,
  showCollapseButton,
}: ExpandableMentionTextProps) {
  return (
    <ExpandableText
      text={text}
      maxChars={maxChars}
      maxLines={maxLines}
      className={className}
      buttonClassName={buttonClassName}
      collapseButtonClassName={collapseButtonClassName}
      htmlRenderer={renderMentionsAsHTML}
      defaultExpanded={defaultExpanded}
      showCollapseButton={showCollapseButton}
    />
  );
}
