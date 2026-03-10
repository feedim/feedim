"use client";

import ExpandableText from "@/components/ExpandableText";
import { renderMentionsAsHTML } from "@/lib/mentionRenderer";

interface ExpandableMentionTextProps {
  text: string;
  maxChars?: number;
  maxLines?: number;
  className?: string;
  buttonClassName?: string;
}

export default function ExpandableMentionText({
  text,
  maxChars,
  maxLines,
  className,
  buttonClassName,
}: ExpandableMentionTextProps) {
  return (
    <ExpandableText
      text={text}
      maxChars={maxChars}
      maxLines={maxLines}
      className={className}
      buttonClassName={buttonClassName}
      htmlRenderer={renderMentionsAsHTML}
    />
  );
}
