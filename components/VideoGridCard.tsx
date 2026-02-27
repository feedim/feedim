"use client";

import Link from "next/link";
import NoImage from "@/components/NoImage";
import BlurImage from "@/components/BlurImage";
import WatchProgressBar from "@/components/WatchProgressBar";
import { formatRelativeDate, formatCount, getPostUrl } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";
import { useTranslations } from "next-intl";

export interface VideoGridItem {
  id: number;
  title: string;
  slug: string;
  video_thumbnail?: string;
  featured_image?: string;
  blurhash?: string | null;
  video_duration?: number;
  view_count?: number;
  published_at?: string;
  content_type?: string;
  visibility?: string;
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

export default function VideoGridCard({ video }: { video: VideoGridItem }) {
  const t = useTranslations();
  const author = video.profiles;

  return (
    <Link href={getPostUrl(video.slug, video.content_type)} className="group block">
      <div className="relative aspect-video min-h-[120px] rounded-xl overflow-hidden bg-bg-tertiary mb-3">
        {(video.video_thumbnail || video.featured_image) ? (
          <BlurImage
            src={(video.video_thumbnail || video.featured_image)!}
            alt={video.title}
            className="w-full h-full"
            blurhash={video.blurhash}
          />
        ) : (
          <NoImage className="w-full h-full" iconSize={28} />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        {video.video_duration && (
          <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[0.7rem] font-medium px-1.5 py-0.5 rounded tabular-nums">
            {formatDuration(video.video_duration)}
          </span>
        )}
        <WatchProgressBar slug={video.slug} />
      </div>
      <div className="flex gap-3 px-0.5">
        <div className="shrink-0 pt-0.5">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" loading="lazy" decoding="async" className="h-10 w-10 rounded-full object-cover bg-bg-tertiary" />
          ) : (
            <img className="default-avatar-auto h-10 w-10 rounded-full object-cover" alt="" loading="lazy" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[0.95rem] font-semibold leading-snug line-clamp-2 text-text-primary group-hover:text-accent-main transition-colors">
            {video.title}
          </h3>
          <p className="text-[0.8rem] text-text-muted mt-1 flex items-center gap-[2px] truncate">
            @{author?.username}
            {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author.premium_plan)} role={author?.role} />}
            {video.published_at && (
              <>
                <span className="text-text-muted/40 text-xs mx-[2px]">·</span>
                <span className="shrink-0">{formatRelativeDate(video.published_at)}</span>
              </>
            )}
          </p>
          <p className="text-[0.7rem] text-text-muted">
            {video.view_count ? `${formatCount(video.view_count)} ${t('common.views')}` : ""}
            {video.visibility && (
              <span> · {video.visibility === 'followers' ? t('post.visibilityFollowers') : video.visibility === 'only_me' ? t('post.visibilityOnlyMe') : t('post.visibilityPublic')}</span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
