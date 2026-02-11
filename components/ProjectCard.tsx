import { Heart, Eye, Edit, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import ShareIconButton from "@/components/ShareIconButton";
import { formatCount } from "@/lib/utils";

interface ProjectCardProps {
  id: string;
  title: string;
  subtitle?: string;
  viewCount?: number;
  /** Override preview iframe src (defaults to /api/projects/{id}/preview) */
  previewSrc?: string;
  editHref: string;
  viewHref?: string;
  shareUrl?: string;
  unpublishConfirm: string | null;
  onUnpublish: (id: string) => void;
  onUnpublishConfirm: (id: string | null) => void;
}

export default function ProjectCard({
  id,
  title,
  subtitle,
  viewCount,
  previewSrc,
  editHref,
  viewHref,
  shareUrl,
  unpublishConfirm,
  onUnpublish,
  onUnpublishConfirm,
}: ProjectCardProps) {
  const previewContent = (
    <iframe
      src={previewSrc || `/api/projects/${id}/preview`}
      className="w-full h-full pointer-events-none scale-[0.2] origin-top-left"
      style={{ width: '500%', height: '500%' }}
      sandbox=""
      loading="lazy"
    />
  );

  return (
    <div className="bg-zinc-900/50 rounded-xl p-3 sm:p-4 flex gap-3 sm:gap-4">
      {/* Preview Thumbnail */}
      {viewHref ? (
        <a href={viewHref} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <div className="w-20 h-28 sm:w-24 sm:h-32 bg-zinc-900 rounded-lg overflow-hidden border border-white/10">
            {previewContent}
          </div>
        </a>
      ) : (
        <div className="shrink-0 w-20 h-28 sm:w-24 sm:h-32 bg-zinc-900 rounded-lg overflow-hidden border border-white/10">
          {previewContent}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {viewCount !== undefined && (
          <span className="flex items-center gap-1 text-[11px] text-gray-500 mb-0.5">
            <Eye className="h-3 w-3" />
            {formatCount(viewCount)} görüntülenme
          </span>
        )}

        <h3 className="text-lg sm:text-xl font-semibold truncate">{title}</h3>

        {subtitle && (
          <p className="text-xs text-gray-500 mb-2 truncate">{subtitle}</p>
        )}

        {/* Actions */}
        {unpublishConfirm === id ? (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onUnpublish(id)}
              className="flex-1 btn-primary text-sm py-2"
            >
              Onayla
            </button>
            <button
              onClick={() => onUnpublishConfirm(null)}
              className="flex-1 btn-secondary text-sm py-2"
            >
              İptal
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-2">
            <Link href={editHref} className="h-8 px-3 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1.5" aria-label="Düzenle">
                <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                Düzenle
            </Link>
            {viewHref && (
              <a
                href={viewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1.5"
                aria-label="Görüntüle"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Görüntüle
              </a>
            )}
            {shareUrl && (
              <ShareIconButton
                url={shareUrl}
                title={title}
                variant="ghost"
                size={16}
              />
            )}
            <button
              onClick={() => onUnpublishConfirm(id)}
              className="h-8 w-8 flex items-center justify-center text-gray-500 hover:text-red-400 rounded-lg transition-all ml-auto"
              aria-label="Sil"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
