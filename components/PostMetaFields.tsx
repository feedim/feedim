"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

interface PostMetaFieldsProps {
  metaTitle: string;
  setMetaTitle: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  metaKeywords: string;
  setMetaKeywords: (v: string) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  contentType?: "post" | "note" | "moment" | "video";
  readOnly?: boolean;
}

export default function PostMetaFields({
  metaTitle, setMetaTitle,
  metaDescription, setMetaDescription,
  metaKeywords, setMetaKeywords,
  expanded, setExpanded,
  contentType = "post",
  readOnly = false,
}: PostMetaFieldsProps) {
  const t = useTranslations("create");
  const label = t(`contentType${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`);

  return (
    <div>
      <div className="cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between w-full text-left">
          <span className="block text-sm font-semibold">{t("postInfo")}</span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
        {readOnly && (
          <p className="text-xs text-text-muted mt-1.5">
            {t("publishedFieldLocked")}
          </p>
        )}
        <p className="text-[0.7rem] text-text-muted/60 leading-relaxed mt-1.5">
          {t("postInfoDesc")}
        </p>
      </div>
      {expanded && (
        <div className="mt-3 space-y-4 px-2">
          <div>
            <label className="block text-xs text-text-muted font-semibold mb-1.5">{t("metaTitle")}</label>
            <input type="text" value={metaTitle}
              onChange={e => setMetaTitle(e.target.value)}
              disabled={readOnly}
              placeholder={t("metaTitlePlaceholder", { type: label })} maxLength={60}
              className={`input-modern w-full ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`} />
            <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaTitle.length}/60</span>
          </div>
          <div>
            <label className="block text-xs text-text-muted font-semibold mb-1.5">{t("metaDescription")}</label>
            <textarea value={metaDescription}
              onChange={e => setMetaDescription(e.target.value)}
              disabled={readOnly}
              placeholder={t("metaDescPlaceholder", { type: label })} maxLength={155} rows={2}
              className={`input-modern w-full resize-none pt-3 ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`} />
            <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaDescription.length}/155</span>
          </div>
          <div>
            <label className="block text-xs text-text-muted font-semibold mb-1.5">{t("metaKeywords")}</label>
            <input type="text" value={metaKeywords}
              onChange={e => setMetaKeywords(e.target.value)}
              disabled={readOnly}
              placeholder={t("metaKeywordsPlaceholder")} maxLength={60}
              className={`input-modern w-full ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`} />
            <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaKeywords.length}/60</span>
          </div>
        </div>
      )}
    </div>
  );
}
