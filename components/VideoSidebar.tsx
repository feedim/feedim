"use client";

import Link from "next/link";
import NoImage from "@/components/NoImage";
import BlurImage from "@/components/BlurImage";
import WatchProgressBar from "@/components/WatchProgressBar";
import { formatCount, formatRelativeDate } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

export interface VideoItem {
  id: number;
  title: string;
  slug: string;
  video_thumbnail?: string;
  featured_image?: string;
  blurhash?: string | null;
  video_duration?: number;
  view_count?: number;
  published_at?: string;
  author_id?: string;
  profiles?: {
    user_id?: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface VideoSidebarProps {
  videos: VideoItem[];
  title?: string;
  compact?: boolean;
}

export default function VideoSidebar({ videos, title, compact }: VideoSidebarProps) {
  if (videos.length === 0) return null;

  return (
    <div>
      {title && (
        <h3 className="text-[1.1rem] font-bold mb-3">{title}</h3>
      )}
      <div className="space-y-1.5">
        {videos.map(video => (
          <Link
            key={video.id}
            href={`/${video.slug}`}
            className="flex gap-2.5 group rounded-lg hover:bg-bg-secondary p-1.5 -mx-1.5 transition"
          >
            {/* Thumbnail */}
            <div className={`relative rounded-md overflow-hidden bg-bg-tertiary shrink-0 ${compact ? "w-[120px] h-[68px]" : "w-[140px] h-[79px]"}`}>
              {(video.video_thumbnail || video.featured_image) ? (
                <BlurImage
                  src={(video.video_thumbnail || video.featured_image)!}
                  className="w-full h-full"
                  blurhash={video.blurhash}
                />
              ) : (
                <NoImage className="w-full h-full" iconSize={24} />
              )}
              {video.video_duration && (
                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[0.62rem] px-1.5 py-0.5 rounded-md font-medium tabular-nums">
                  {formatDuration(video.video_duration)}
                </span>
              )}
              <WatchProgressBar slug={video.slug} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 py-0.5">
              <p className={`font-semibold leading-snug line-clamp-2 group-hover:text-text-primary ${compact ? "text-[0.78rem]" : "text-[0.82rem]"}`}>
                {video.title}
              </p>
              <div className="mt-0 space-y-0.5">
                <p className="text-[0.72rem] text-text-muted font-medium flex items-center gap-1">
                  @{video.profiles?.username}
                  {video.profiles?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(video.profiles.premium_plan)} role={video.profiles?.role} />}
                </p>
                <p className="text-[0.62rem] text-text-muted">
                  {video.view_count ? `${formatCount(video.view_count)} görüntülenme` : ""}
                  {video.view_count && video.published_at ? " " : ""}
                  {video.published_at ? formatRelativeDate(video.published_at) : ""}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
