import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { Heart, Coins, Bookmark, Eye } from "lucide-react";

interface TemplateCardProps {
  template: any;
  isSaved?: boolean;
  isPurchased?: boolean;
  showPrice?: boolean;
  showSaveButton?: boolean;
  onSaveToggle?: (templateId: string) => void;
  onClick: () => void;
  /** Explore mode: shows view count badge + Görüntüle/Şablonu Kullan buttons */
  exploreMode?: boolean;
  exploreSlug?: string;
  exploreViewCount?: number;
  /** If set, iframe uses src instead of srcDoc (for showing customized project preview) */
  previewUrl?: string;
}

export default function TemplateCard({
  template,
  isSaved = false,
  isPurchased = false,
  showPrice = true,
  showSaveButton = true,
  onSaveToggle,
  onClick,
  exploreMode = false,
  exploreSlug,
  exploreViewCount = 0,
  previewUrl,
}: TemplateCardProps) {
  const isPublished = template.projectStatus === 'published';

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveToggle) {
      onSaveToggle(template.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden border border-white/10 hover:border-pink-500/30 transition-all cursor-pointer"
      style={{ borderRadius: '29px' }}
    >
      {/* Template Preview */}
      <div className="absolute inset-0 overflow-hidden bg-zinc-900">
        {previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full pointer-events-none scale-[0.3] origin-top-left"
            style={{ width: '333%', height: '333%' }}
            sandbox=""
            loading="lazy"
          />
        ) : template.html_content ? (
          <iframe
            srcDoc={DOMPurify.sanitize(template.html_content, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style', 'link'], ADD_ATTR: ['data-editable', 'data-type', 'data-label'] })}
            className="w-full h-full pointer-events-none scale-[0.3] origin-top-left"
            style={{ width: '333%', height: '333%' }}
            sandbox=""
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-20 w-20 text-pink-500 fill-pink-500 animate-pulse" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Top Right: Save Button or View Count */}
      {exploreMode ? (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5 text-gray-300" />
          <span className="text-xs font-medium text-gray-300">{exploreViewCount.toLocaleString()}</span>
        </div>
      ) : showSaveButton ? (
        <button
          onClick={handleSaveClick}
          className="absolute top-3 right-3 z-10 p-3 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all pointer-events-auto flex items-center justify-center active:scale-95"
          aria-label={isSaved ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
        >
          <Bookmark
            className={`h-6 w-6 transition-all ${isSaved ? 'scale-110' : 'text-white'}`}
            style={isSaved ? { fill: '#e30076', color: '#e30076' } : {}}
            aria-hidden="true"
          />
        </button>
      ) : null}

      {/* Content Overlay */}
      <div className="absolute inset-0 p-6 flex flex-col justify-between bg-gradient-to-t from-black via-black/50 to-transparent">
        <div className="flex items-start">
          <div className="flex items-center gap-2">
            {template.is_featured && (
              <span className="bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                ÖNE ÇIKAN
              </span>
            )}
            {isPurchased && !isPublished && (
              <span className="bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                SATIN ALINDI
              </span>
            )}
            {isPublished && (
              <span className="bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                YAYINDA
              </span>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-2 truncate">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">
              {template.description}
            </p>
          )}

          {exploreMode ? (
            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <Link
                href={`/p/${exploreSlug}`}
                target="_blank"
                className="btn-primary w-full py-2.5 text-sm text-center pointer-events-auto"
              >
                Goruntule
              </Link>
              {template.id && (
                <Link
                  href={`/dashboard/editor/${template.id}`}
                  className="btn-secondary w-full py-2.5 text-sm text-center pointer-events-auto"
                >
                  Sablonu Kullan
                </Link>
              )}
            </div>
          ) : isPublished ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {template.projectSlug && (
                <Link
                  href={`/p/${template.projectSlug}`}
                  target="_blank"
                  className="btn-secondary flex-1 py-2.5 text-sm text-center pointer-events-auto"
                >
                  Görüntüle
                </Link>
              )}
              <Link
                href={`/dashboard/editor/${template.id}`}
                className="btn-primary flex-1 py-2.5 text-sm text-center pointer-events-auto"
              >
                Düzenle
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {showPrice && (
                <>
                  <div className="flex items-center gap-2 shrink-0">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    <span className="text-3xl font-black text-yellow-500">
                      {template.coin_price || 0}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/20 shrink-0"></div>
                </>
              )}
              <div className="btn-primary flex-1 py-2.5 text-sm text-center pointer-events-none">
                {isPurchased ? 'Yayına Al' : 'Satın Al'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
