"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Link as LinkIcon, ChevronRight, Code2 } from "lucide-react";
import { copyTextToClipboard } from "@/lib/copyTextToClipboard";
import Modal from "./Modal";
import { feedimAlert } from "@/components/FeedimAlert";
import { getShareablePostUrl } from "@/lib/utils";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  postId?: number;
  isVideo?: boolean;
  postSlug?: string;
  contentType?: string;
  onShareSuccess?: () => void;
}

const platforms = [
  { id: "wa", name: "WhatsApp", icon: "wa" },
  { id: "tw", name: "X", icon: "tw" },
  { id: "fb", name: "Facebook", icon: "fb" },
  { id: "native", name: "other", icon: "share" },
];

export default function ShareModal({ open, onClose, url, title, postId, isVideo, postSlug, contentType, onShareSuccess }: ShareModalProps) {
  const t = useTranslations("modals");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);

  const sharePath = postSlug ? getShareablePostUrl(postSlug, contentType) : url;
  const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://feedim.com";
  const isMoment = contentType === "moment";
  const embedCode = postSlug
    ? isMoment
      ? `<iframe src="${baseUrl}/embed/${postSlug}" style="width:100%;max-width:400px;min-height:600px;aspect-ratio:9/16;border:none;border-radius:12px;" allowfullscreen></iframe>`
      : isVideo
        ? `<iframe src="${baseUrl}/embed/${postSlug}" style="width:100%;aspect-ratio:16/9;border:none;" allowfullscreen></iframe>`
        : `<iframe src="${baseUrl}/embed/${postSlug}" style="width:100%;height:420px;border:none;border-radius:12px;overflow:hidden;" allowfullscreen></iframe>`
    : "";

  const trackShare = async (platform: string) => {
    if (postId) {
      try {
        const res = await fetch(`/api/posts/${postId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });
        if (res.status === 429 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          feedimAlert("error", data.error || t("shareLimitReached"));
        }
      } catch {}
    }
  };

  const handleCopy = async () => {
    const copiedOk = await copyTextToClipboard(fullUrl);
    if (!copiedOk) {
      feedimAlert("error", tc("genericError"));
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackShare("copy_link");
  };

  const handleCopyEmbed = async () => {
    const copiedOk = await copyTextToClipboard(embedCode);
    if (!copiedOk) {
      feedimAlert("error", tc("genericError"));
      return;
    }
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
    trackShare("embed");
  };

  const handleShare = (platformId: string) => {
    switch (platformId) {
      case "wa":
        window.open(`https://wa.me/?text=${encodeURIComponent(title + " " + fullUrl)}`);
        break;
      case "tw":
        window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`);
        break;
      case "fb":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`);
        break;
      case "native":
        if (navigator.share) {
          try {
            const shareUrl = fullUrl.startsWith("http") ? fullUrl : `${window.location.origin}${fullUrl}`;
            navigator.share({ title, url: shareUrl }).catch(() => {});
          } catch {}
        }
        break;
    }
    trackShare(platformId);
    onShareSuccess?.();
    onClose();
  };

  const PlatformIcon = ({ id }: { id: string }) => {
    switch (id) {
      case "wa":
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.11.546 4.094 1.504 5.82L0 24l6.335-1.652A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.82a9.82 9.82 0 01-5.352-1.578l-.384-.228-3.97 1.035 1.06-3.862-.253-.399A9.8 9.8 0 012.18 12c0-5.422 4.398-9.82 9.82-9.82 5.422 0 9.82 4.398 9.82 9.82 0 5.422-4.398 9.82-9.82 9.82z"/>
          </svg>
        );
      case "tw":
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      case "fb":
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
          </svg>
        );
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={t("share")} size="sm" infoText={t("shareInfoText")}>
        <div className="p-2 space-y-1">
          {/* Platform buttons */}
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => handleShare(p.id)}
              aria-label={p.id === "native" ? t("other") : p.name}
              className="flex items-center gap-3 w-full px-2 py-3 rounded-[14px] hover:bg-bg-tertiary transition text-left"
            >
              <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center text-text-primary shrink-0">
                <PlatformIcon id={p.icon} />
              </div>
              <span className="flex-1 text-[0.93rem] font-medium text-text-primary">
                {p.id === "native" ? t("other") : p.name}
              </span>
              <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
            </button>
          ))}

          {/* Embed code button — opens separate modal */}
          {postSlug && (
            <button
              onClick={() => setShowEmbed(true)}
              className="flex items-center gap-3 w-full px-2 py-3 rounded-[14px] hover:bg-bg-tertiary transition text-left mt-2"
            >
              <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
                <Code2 className="h-4 w-4 text-text-muted" />
              </div>
              <span className="flex-1 text-[0.93rem] font-medium text-text-primary">
                {t("embedCode")}
              </span>
              <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
            </button>
          )}

          {/* URL Copy bar */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 w-full px-4 py-3 bg-bg-tertiary rounded-[14px] hover:bg-bg-tertiary transition text-left mt-2 mb-1"
          >
            <div className="w-9 h-9 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
              {copied ? <Check className="h-4 w-4 text-accent-main" /> : <LinkIcon className="h-4 w-4 text-text-muted" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.82rem] font-semibold text-text-primary">
                {copied ? t("copied") : t("copyLink")}
              </p>
              <p className="text-[0.72rem] text-text-muted truncate">{fullUrl}</p>
            </div>
          </button>
        </div>
      </Modal>

      {/* Embed Code Modal */}
      <Modal open={showEmbed} onClose={() => setShowEmbed(false)} title={t("embedCode")} size="sm" infoText={t("embedInfoText")}>
        <div className="p-4 space-y-3">
          <p className="text-[0.82rem] text-text-muted">{t("embedInfoText")}</p>
          <div className="bg-bg-primary rounded-xl p-3 text-[0.72rem] text-text-muted font-mono break-all leading-relaxed select-all border border-border-primary">
            {embedCode}
          </div>
          <button
            onClick={handleCopyEmbed}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-[0.93rem] font-medium transition"
            style={embedCopied ? { backgroundColor: "var(--accent-color)", color: "#fff" } : { backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}
          >
            {embedCopied ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
            {embedCopied ? t("copied") : t("copyCode")}
          </button>
        </div>
      </Modal>
    </>
  );
}
