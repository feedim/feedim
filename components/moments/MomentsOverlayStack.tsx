"use client";

import { Suspense, lazy } from "react";
import type { Moment } from "@/components/moments/types";

const CommentsModal = lazy(() => import("@/components/modals/CommentsModal"));
const ShareModal = lazy(() => import("@/components/modals/ShareModal"));
const PostMoreModal = lazy(() => import("@/components/modals/PostMoreModal"));
const LikesModal = lazy(() => import("@/components/modals/LikesModal"));

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

interface MomentsOverlayStackProps {
  commentModal: CommentModalState | null;
  setCommentModal: (state: CommentModalState | null) => void;
  shareModal: ShareModalState | null;
  setShareModal: (state: ShareModalState | null) => void;
  optionsModal: OptionsModalState | null;
  setOptionsModal: (state: OptionsModalState | null) => void;
  likesModalPostId: number | null;
  setLikesModalPostId: (postId: number | null) => void;
  setMoments: React.Dispatch<React.SetStateAction<Moment[]>>;
  idlePaused: boolean;
  idleTitle: string;
  idleDescription: string;
  continueLabel: string;
  stopLabel: string;
  onContinueWatching: () => void;
  onStopWatching: () => void;
}

export default function MomentsOverlayStack({
  commentModal,
  setCommentModal,
  shareModal,
  setShareModal,
  optionsModal,
  setOptionsModal,
  likesModalPostId,
  setLikesModalPostId,
  setMoments,
  idlePaused,
  idleTitle,
  idleDescription,
  continueLabel,
  stopLabel,
  onContinueWatching,
  onStopWatching,
}: MomentsOverlayStackProps) {
  return (
    <>
      {commentModal && (
        <Suspense fallback={null}>
          <CommentsModal
            open={!!commentModal}
            onClose={() => setCommentModal(null)}
            postId={commentModal.postId}
            commentCount={commentModal.count}
            postSlug={commentModal.slug}
          />
        </Suspense>
      )}

      {shareModal && (
        <Suspense fallback={null}>
          <ShareModal
            open={!!shareModal}
            onClose={() => setShareModal(null)}
            url={shareModal.url}
            title={shareModal.title}
            postId={shareModal.postId}
            isVideo
            postSlug={shareModal.slug}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <PostMoreModal
          open={!!optionsModal}
          onClose={() => setOptionsModal(null)}
          postId={optionsModal?.postId ?? 0}
          postUrl={optionsModal ? `/moments?s=${optionsModal.slug}` : ""}
          authorUsername={optionsModal?.authorUsername}
          authorUserId={optionsModal?.authorUserId}
          authorName={optionsModal?.authorName}
          authorRole={optionsModal?.authorRole}
          postSlug={optionsModal?.slug}
          contentType="moment"
          visibility={optionsModal?.visibility || "public"}
          onDeleteSuccess={() => {
            setMoments((prev) => prev.filter((moment) => moment.id !== optionsModal?.postId));
          }}
        />
      </Suspense>

      {likesModalPostId !== null && (
        <Suspense fallback={null}>
          <LikesModal
            open={likesModalPostId !== null}
            onClose={() => setLikesModalPostId(null)}
            postId={likesModalPostId}
          />
        </Suspense>
      )}

      {idlePaused && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-bg-primary rounded-2xl p-6 mx-4 max-w-[320px] w-full text-center shadow-xl">
            <p className="text-lg font-bold text-text-primary mb-1">{idleTitle}</p>
            <p className="text-sm text-text-muted mb-5">{idleDescription}</p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onContinueWatching}
                className="w-full h-11 rounded-xl bg-accent-main text-white font-semibold text-sm hover:opacity-90 transition"
              >
                {continueLabel}
              </button>
              <button
                onClick={onStopWatching}
                className="w-full h-11 rounded-xl bg-bg-secondary text-text-primary font-medium text-sm hover:bg-bg-tertiary transition"
              >
                {stopLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
