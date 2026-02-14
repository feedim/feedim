import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { Heart, Coins, Bookmark, Eye, Users } from "lucide-react";
import { useRef, useState } from "react";
import { isDiscountActive } from "@/lib/discount";
import { ShareSheet } from "@/components/ShareIconButton";

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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasDiscount = isDiscountActive(template);
  const [shareOpen, setShareOpen] = useState(false);

  // Deterministic fake social proof count (80–329 range) for templates with 0 purchases
  const socialProofCount = template.purchase_count > 0
    ? template.purchase_count
    : ((template.id || '').split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 250) + 80;

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveToggle) {
      onSaveToggle(template.id);
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div
      className="group relative aspect-[3/4] bg-zinc-900 overflow-hidden border border-white/10 hover:border-pink-500/30 transition-all cursor-pointer"
      style={{ borderRadius: '29px' }}
    >
      {/* Template Preview */}
      <div className="absolute inset-0 overflow-hidden bg-zinc-900">
        {previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full pointer-events-none scale-[0.3] origin-top-left"
            style={{ width: '333%', height: '333%' }}
            sandbox="allow-same-origin"
            loading="lazy"
          />
        ) : template.html_content ? (
          <iframe
            ref={iframeRef}
            srcDoc={DOMPurify.sanitize(template.html_content, { WHOLE_DOCUMENT: true, ADD_TAGS: ['style', 'link'], ADD_ATTR: ['data-editable', 'data-type', 'data-label', 'data-locked'] })}
            className="w-full h-full pointer-events-none scale-[0.3] origin-top-left"
            style={{ width: '333%', height: '333%' }}
            sandbox="allow-same-origin"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Heart className="h-20 w-20 text-pink-500 fill-pink-500 animate-pulse" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Top Right: Share + Save Buttons or View Count */}
      {exploreMode ? (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-xs font-medium text-zinc-300">{exploreViewCount.toLocaleString()}</span>
        </div>
      ) : (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
          {/* Share Button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShareOpen(true); }}
            className="p-3 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all flex items-center justify-center active:scale-95"
            aria-label="Paylaş"
          >
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </button>
          {/* Save Button */}
          {showSaveButton && (
            <button
              onClick={handleSaveClick}
              className="p-3 rounded-xl bg-black/50 hover:bg-black/70 backdrop-blur-sm transition-all flex items-center justify-center active:scale-95"
              aria-label={isSaved ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
            >
              <Bookmark
                className={`h-6 w-6 transition-all ${isSaved ? 'scale-110' : 'text-white'}`}
                style={isSaved ? { fill: '#e30076', color: '#e30076' } : {}}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
      )}
      {/* Share Sheet */}
      <ShareSheet
        url={typeof window !== 'undefined' ? `${window.location.origin}/editor/${template.id}` : `/editor/${template.id}`}
        title={template.name || 'Şablon'}
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      {/* Content Overlay */}
      <div onClick={onClick} className="absolute inset-0 p-6 flex flex-col justify-between bg-gradient-to-t from-black via-black/50 to-transparent">
        <div className="flex items-start">
          <div className="flex items-center gap-2">
            {hasDiscount && template.discount_label && !isPurchased && !isPublished && (
              <span className="bg-pink-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase">
                {template.discount_label}
              </span>
            )}
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
            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
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
                Görüntüle
              </Link>
              {template.id && (
                <Link
                  href={`/editor/${template.id}`}
                  className="btn-secondary w-full py-2.5 text-sm text-center pointer-events-auto"
                >
                  Şablonu Kullan
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
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Coins className="h-6 w-6 text-yellow-500" />
                    {hasDiscount ? (
                      <>
                        <span className="text-base font-bold text-zinc-500 line-through decoration-red-500/70 decoration-2">
                          {template.coin_price}
                        </span>
                        <span className="text-3xl font-black text-yellow-500">
                          {template.discount_price}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xl font-black text-yellow-500">
                        {template.coin_price || 0}
                      </span>
                    )}
                  </div>
                  <div className="w-px h-8 bg-white/20 shrink-0"></div>
                </>
              )}
              <div className="btn-primary flex-1 py-2.5 text-sm text-center pointer-events-none">
                Düzenle
              </div>
            </div>
          )}

          {/* Social proof */}
          {!isPurchased && !isPublished && (
            <div className="flex items-center gap-1.5 mt-2">
              <Users className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-xs text-zinc-500">{socialProofCount} kişi kullandı</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
