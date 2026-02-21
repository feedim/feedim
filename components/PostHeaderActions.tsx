"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
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
}

export default function PostHeaderActions({ postId, postUrl, postTitle, authorUsername, authorUserId, authorName, isOwnPost, postSlug, portalToHeader, isVideo }: PostHeaderActionsProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null);

  useEffect(() => {
    setMounted(true);
    if (portalToHeader) {
      setHeaderSlot(document.getElementById("header-right-slot"));
    }
  }, [portalToHeader]);

  const button = (
    <button
      onClick={() => setMoreOpen(true)}
      className="i-btn !w-9 !h-9 text-text-muted hover:text-text-primary"
      aria-label="Gönderi seçenekleri"
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
      />
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={postUrl}
        title={postTitle}
        postId={postId}
        isVideo={isVideo}
        postSlug={postSlug}
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
