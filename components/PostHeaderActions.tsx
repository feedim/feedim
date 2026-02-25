"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import PostMoreModal from "@/components/modals/PostMoreModal";
import ShareModal from "@/components/modals/ShareModal";

interface PostHeaderActionsProps {
  postId: number;
  postUrl: string;
  postTitle: string;
  authorUsername?: string;
  authorUserId?: string;
  authorName?: string;
  isOwnPost?: boolean;
  postSlug?: string;
  portalToHeader?: boolean;
  isVideo?: boolean;
  contentType?: "post" | "video" | "moment";
  onDeleteSuccess?: () => void;
}

export default function PostHeaderActions({ postId, postUrl, postTitle, authorUsername, authorUserId, authorName, isOwnPost, postSlug, portalToHeader, isVideo, contentType, onDeleteSuccess }: PostHeaderActionsProps) {
  const t = useTranslations("common");
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!portalToHeader) return;
    // Try immediately
    const el = document.getElementById("header-right-slot");
    if (el) { setHeaderSlot(el); return; }
    // Retry with rAF in case header hasn't rendered yet
    let raf: number;
    const tryFind = () => {
      const slot = document.getElementById("header-right-slot");
      if (slot) { setHeaderSlot(slot); return; }
      raf = requestAnimationFrame(tryFind);
    };
    raf = requestAnimationFrame(tryFind);
    const timeout = setTimeout(() => cancelAnimationFrame(raf), 2000);
    return () => { cancelAnimationFrame(raf); clearTimeout(timeout); };
  }, [portalToHeader]);

  const button = (
    <button
      onClick={() => setMoreOpen(true)}
      className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary"
      aria-label={t("postOptions")}
    >
      <MoreHorizontal className="h-[20px] w-[20px]" />
    </button>
  );

  const modals = (
    <>
      <PostMoreModal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        postId={postId}
        postUrl={postUrl}
        authorUsername={authorUsername}
        authorUserId={authorUserId}
        authorName={authorName}
        onShare={() => setShareOpen(true)}
        isOwnPost={isOwnPost}
        postSlug={postSlug}
        contentType={contentType}
        onDeleteSuccess={onDeleteSuccess}
      />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={postUrl}
        title={postTitle}
        postId={postId}
        isVideo={isVideo}
        postSlug={postSlug}
        contentType={contentType}
      />
    </>
  );

  // Portal mode: render nothing during SSR, portal after mount
  if (portalToHeader) {
    if (!mounted) return null;
    return (
      <>
        {headerSlot ? createPortal(button, headerSlot) : null}
        {modals}
      </>
    );
  }

  return (
    <>
      {button}
      {modals}
    </>
  );
}
