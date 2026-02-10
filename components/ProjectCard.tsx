import { Heart, Eye, Edit, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import ShareIconButton from "@/components/ShareIconButton";
import { formatCount } from "@/lib/utils";

interface ProjectCardProps {
  id: string;
  title: string;
  subtitle?: string;
  viewCount?: number;
  htmlContent?: string;
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
  htmlContent,
  editHref,
  viewHref,
  shareUrl,
  unpublishConfirm,
  onUnpublish,
  onUnpublishConfirm,
}: ProjectCardProps) {
  return (
    <div className="py-4 border-b border-white/5 last:border-b-0 flex gap-4">
      {/* Preview Thumbnail */}
      {viewHref ? (
        <a href={viewHref} target="_blank" className="shrink-0">
          <div className="w-24 h-32 bg-zinc-900 rounded-xl overflow-hidden">
            {htmlContent ? (
              <iframe
                srcDoc={DOMPurify.sanitize(htmlContent, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style', 'link'], ADD_ATTR: ['data-editable', 'data-type', 'data-label'] })}
                className="w-full h-full pointer-events-none scale-[0.2] origin-top-left"
                style={{ width: '500%', height: '500%' }}
                sandbox=""
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
              </div>
            )}
          </div>
        </a>
      ) : (
        <div className="shrink-0 w-24 h-32 bg-zinc-900 rounded-xl overflow-hidden">
          {htmlContent ? (
            <iframe
              srcDoc={DOMPurify.sanitize(htmlContent, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style', 'link'], ADD_ATTR: ['data-editable', 'data-type', 'data-label'] })}
              className="w-full h-full pointer-events-none scale-[0.2] origin-top-left"
              style={{ width: '500%', height: '500%' }}
              sandbox=""
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Heart className="h-6 w-6 fill-pink-500 text-pink-500" />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <h3 className="text-base font-semibold truncate">{title}</h3>
          {viewCount !== undefined && (
            <span className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
              <Eye className="h-3.5 w-3.5" />
              {formatCount(viewCount)}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-gray-500 mb-2.5 truncate">{subtitle}</p>
        )}

        {/* Actions */}
        {unpublishConfirm === id ? (
          <div className="flex gap-2">
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
              Iptal
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Link href={editHref}>
              <button className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1.5" aria-label="Düzenle">
                <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                Duzenle
              </button>
            </Link>
            {viewHref && (
              <a
                href={viewHref}
                target="_blank"
                className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all flex items-center gap-1.5"
                aria-label="Görüntüle"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Goruntule
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
              className="p-2 text-gray-500 hover:text-white rounded-lg transition-all ml-auto"
              aria-label="Yayından Kaldır"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
