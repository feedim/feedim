import Link from "next/link";
import NoImage from "@/components/NoImage";
import BlurImage from "@/components/BlurImage";
import { formatRelativeDate, formatCount } from "@/lib/utils";
import VerifiedBadge, { getBadgeVariant } from "@/components/VerifiedBadge";

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
  profiles?: {
    user_id?: string;
    username: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
  };
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoGridCard({ video }: { video: VideoGridItem }) {
  const author = video.profiles;

  return (
    <Link href={`/post/${video.slug}`} className="group block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-bg-tertiary mb-3">
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
        {video.video_duration && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[0.75rem] px-2 py-0.5 rounded-md font-medium tabular-nums">
            {formatDuration(video.video_duration)}
          </span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
      </div>
      <div className="flex gap-3 px-0.5">
        <div className="shrink-0 pt-0.5">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />
          ) : (
            <img className="default-avatar-auto h-10 w-10 rounded-full object-cover" alt="" loading="lazy" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[0.95rem] font-semibold leading-snug line-clamp-2 text-text-primary group-hover:text-accent-main transition-colors">
            {video.title}
          </h3>
          <p className="text-[0.8rem] text-text-muted mt-1 flex items-center gap-1 truncate">
            @{author?.username}
            {author?.is_verified && <VerifiedBadge size="sm" variant={getBadgeVariant(author.premium_plan)} />}
          </p>
          <p className="text-[0.76rem] text-text-muted">
            {video.view_count ? `${formatCount(video.view_count)} görüntüleme` : ""}
            {video.view_count && video.published_at ? " · " : ""}
            {video.published_at ? formatRelativeDate(video.published_at) : ""}
          </p>
        </div>
      </div>
    </Link>
  );
}
