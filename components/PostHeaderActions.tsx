"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import PostMoreModal from "@/components/modals/PostMoreModal";
import ShareModal from "@/components/modals/ShareModal";
import { useHydrated } from "@/lib/useHydrated";

interface PostHeaderActionsProps {
  postId: number;
  postUrl: string;
  postTitle: string;
  authorUsername?: string;
  authorUserId?: string;
  authorName?: string;
  authorRole?: string;
  isOwnPost?: boolean;
  postSlug?: string;
  portalToHeader?: boolean;
  isVideo?: boolean;
  contentType?: "post" | "note" | "video" | "moment";
  onDeleteSuccess?: () => void;
  visibility?: string;
  isSponsored?: boolean;
  isBoosted?: boolean;
}

export default function PostHeaderActions({ postId, postUrl, postTitle, authorUsername, authorUserId, authorName, authorRole, isOwnPost, postSlug, portalToHeader, isVideo, contentType, onDeleteSuccess, visibility, isSponsored, isBoosted }: PostHeaderActionsProps) {
  const t = useTranslations("common");
  const hydrated = useHydrated();
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const portalEnabled = hydrated && !!portalToHeader;

  useEffect(() => {
    if (!portalEnabled) return;
    // Poll for the slot element — use setInterval for reliability during navigation
    const check = () => !!document.getElementById("header-right-slot");
    if (check()) { setPortalReady(true); return; }
    const interval = setInterval(() => {
      if (check()) { setPortalReady(true); clearInterval(interval); }
    }, 50);
    const timeout = setTimeout(() => clearInterval(interval), 5000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [portalEnabled]);

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
        authorRole={authorRole}
        onShare={() => setShareOpen(true)}
        isOwnPost={isOwnPost}
        postSlug={postSlug}
        contentType={contentType}
        onDeleteSuccess={onDeleteSuccess}
        visibility={visibility}
        isSponsored={isSponsored}
        isBoosted={isBoosted}
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

  // Portal mode: always look up slot fresh to avoid stale references during navigation
  if (portalToHeader) {
    if (!portalEnabled || !portalReady) return <>{modals}</>;
    const slot = document.getElementById("header-right-slot");
    return (
      <>
        {slot ? createPortal(button, slot) : null}
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
