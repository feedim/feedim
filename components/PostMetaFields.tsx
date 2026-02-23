"use client";

import { ChevronDown } from "lucide-react";

interface PostMetaFieldsProps {
  metaTitle: string;
  setMetaTitle: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  metaKeywords: string;
  setMetaKeywords: (v: string) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  contentType?: "post" | "moment" | "video";
}

const LABELS: Record<string, string> = {
  post: "Gönderi",
  moment: "Moment",
  video: "Video",
};

export default function PostMetaFields({
  metaTitle, setMetaTitle,
  metaDescription, setMetaDescription,
  metaKeywords, setMetaKeywords,
  expanded, setExpanded,
  contentType = "post",
}: PostMetaFieldsProps) {
  const label = LABELS[contentType] || "Gönderi";

  return (
    <div>
      <div className="cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between w-full text-left">
          <span className="block text-sm font-semibold">Gönderi bilgileri</span>
          <ChevronDown className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
        <p className="text-[0.7rem] text-text-muted/60 leading-relaxed mt-1.5">
          Bu alandaki metinler içeriğinizin görünürlüğünü ve sıralamasını belirleyen etkenlerdir. Arama motorları için de kullanılır. Manuel girilmezse Feedim AI tarafından otomatik oluşturulur.
        </p>
      </div>
      {expanded && (
        <div className="mt-3 space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Ana konu başlığı</label>
            <input type="text" value={metaTitle}
              onChange={e => setMetaTitle(e.target.value)}
              placeholder={`${label} ana konusu...`} maxLength={60}
              className="input-modern w-full" />
            <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaTitle.length}/60</span>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Açıklama</label>
            <textarea value={metaDescription}
              onChange={e => setMetaDescription(e.target.value)}
              placeholder={`${label} açıklaması...`} maxLength={155} rows={3}
              className="input-modern w-full resize-none pt-3" />
            <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaDescription.length}/155</span>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Anahtar kelime</label>
            <input type="text" value={metaKeywords}
              onChange={e => setMetaKeywords(e.target.value)}
              placeholder="Anahtar kelime..." maxLength={200}
              className="input-modern w-full" />
            <span className="text-[0.65rem] text-text-muted/60 mt-1 block">{metaKeywords.length}/200</span>
          </div>
        </div>
      )}
    </div>
  );
}
