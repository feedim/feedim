"use client";

import { memo } from "react";
import Link from "next/link";
import { formatCount } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface MomentGridCardProps {
  moment: {
    id: number;
    title: string;
    slug: string;
    video_thumbnail?: string;
    featured_image?: string;
    video_duration?: number;
    view_count?: number;
  };
}

export default memo(function MomentGridCard({ moment }: MomentGridCardProps) {
  const t = useTranslations();
  const thumb = moment.video_thumbnail || moment.featured_image;

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Link
      href={`/moments?s=${moment.slug}`}
      className="relative block aspect-[9/16] bg-black overflow-hidden group"
    >
      {thumb ? (
        <img src={thumb} alt={moment.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
          <svg className="h-8 w-8 text-text-muted" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* View count — bottom left */}
      {moment.view_count !== undefined && moment.view_count > 0 && (
        <div className="absolute bottom-1.5 left-1.5 text-white text-[0.66rem] font-medium" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
          {formatCount(moment.view_count)} {t('common.views')}
        </div>
      )}
    </Link>
  );
});
