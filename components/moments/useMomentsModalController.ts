"use client";

import { useCallback, useState } from "react";
import type { Moment } from "@/components/moments/types";

interface CommentModalState {
  postId: number;
  count: number;
  slug: string;
  allowComments?: boolean;
}

interface ShareModalState {
  url: string;
  title: string;
  postId: number;
  slug: string;
}

interface OptionsModalState {
  postId: number;
  slug: string;
  title: string;
  authorUsername?: string;
  authorUserId?: string;
  authorName?: string;
  authorRole?: string;
  visibility?: string;
}

export function useMomentsModalController() {
  const [commentModal, setCommentModal] = useState<CommentModalState | null>(null);
  const [shareModal, setShareModal] = useState<ShareModalState | null>(null);
  const [optionsModal, setOptionsModal] = useState<OptionsModalState | null>(null);
  const [likesModalPostId, setLikesModalPostId] = useState<number | null>(null);
  const [globalMuted, setGlobalMuted] = useState(true);

  const handleComment = useCallback((moment: Moment) => {
    setCommentModal({
      postId: moment.id,
      count: moment.comment_count || 0,
      slug: moment.slug,
    });
  }, []);

  const handleLikesOpen = useCallback((momentId: number) => {
    setLikesModalPostId(momentId);
  }, []);

  const handleShare = useCallback((moment: Moment) => {
    setShareModal({
      url: `/moments?s=${moment.slug}`,
      title: moment.title,
      postId: moment.id,
      slug: moment.slug,
    });
  }, []);

  const handleOptions = useCallback((moment: Moment) => {
    setOptionsModal({
      postId: moment.id,
      slug: moment.slug,
      title: moment.title,
      authorUsername: moment.profiles?.username,
      authorUserId: moment.profiles?.user_id,
      authorName: moment.profiles?.full_name || moment.profiles?.name || undefined,
      authorRole: moment.profiles?.role,
      visibility: moment.visibility || "public",
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setGlobalMuted((prev) => !prev);
  }, []);

  return {
    commentModal,
    setCommentModal,
    shareModal,
    setShareModal,
    optionsModal,
    setOptionsModal,
    likesModalPostId,
    setLikesModalPostId,
    globalMuted,
    handleComment,
    handleLikesOpen,
    handleShare,
    handleOptions,
    handleToggleMute,
  };
}
