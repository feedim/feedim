"use client";

import { memo } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { formatCount } from "@/lib/utils";

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
  const thumb = moment.video_thumbnail || moment.featured_image;

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <Link
      href={`/dashboard/moments?id=${moment.id}`}
      className="relative block aspect-[9/16] bg-black rounded-[4px] overflow-hidden group"
    >
      {thumb ? (
        <img src={thumb} alt={moment.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full bg-bg-tertiary flex items-center justify-center">
          <svg className="h-8 w-8 text-text-muted/30" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

      {/* View count — bottom left */}
      {moment.view_count !== undefined && moment.view_count > 0 && (
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-white text-[0.6rem] font-medium">
          <Eye className="h-3 w-3" />
          {formatCount(moment.view_count)}
        </div>
      )}

      {/* Duration badge — bottom right */}
      {moment.video_duration && moment.video_duration > 0 && (
        <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[0.6rem] font-medium px-1.5 py-0.5 rounded-md">
          {fmtDuration(moment.video_duration)}
        </div>
      )}
    </Link>
  );
});
