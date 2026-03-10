"use client";

import { useTranslations } from "next-intl";
import ExpandableMentionText from "@/components/ExpandableMentionText";

interface VideoDescriptionProps {
  text: string;
}

export default function VideoDescription({ text }: VideoDescriptionProps) {
  const t = useTranslations("common");

  return (
    <div
      className="mt-3 mb-3 p-4 rounded-[12px] bg-bg-secondary cursor-pointer transition hover:bg-bg-secondary select-none"
      onCopy={(e) => e.preventDefault()}
    >
      <span className="text-[0.88rem] font-bold block mb-2">{t("description")}</span>
      <ExpandableMentionText
        text={text}
        maxChars={360}
        maxLines={3}
        className="text-[0.88rem] leading-[1.65] text-text-readable whitespace-pre-wrap"
        buttonClassName="mt-1.5 inline-flex w-fit text-[0.82rem] font-semibold text-text-primary hover:underline"
        collapseButtonClassName="mt-1.5 inline-flex w-fit text-[0.82rem] font-semibold text-text-primary hover:underline"
        showCollapseButton
      />
    </div>
  );
}
