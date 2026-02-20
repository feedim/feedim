"use client";

import { useState } from "react";
import { formatCount } from "@/lib/utils";
import LikesModal from "@/components/modals/LikesModal";

interface PostStatsProps {
  viewCount?: number;
  likeCount?: number;
  postId?: number;
}

export default function PostStats({ viewCount = 0, likeCount = 0, postId }: PostStatsProps) {
  const [likesOpen, setLikesOpen] = useState(false);

  if (viewCount <= 0 && likeCount <= 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 text-[0.72rem] text-text-muted shrink-0">
        {viewCount > 0 && (
          <span className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {formatCount(viewCount)} görüntülenme
          </span>
        )}
        {likeCount > 0 && (
          <button
            onClick={() => postId && setLikesOpen(true)}
            className="flex items-center gap-1 hover:underline"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
            </svg>
            {formatCount(likeCount)} beğeni
          </button>
        )}
      </div>

      {postId && (
        <LikesModal
          open={likesOpen}
          onClose={() => setLikesOpen(false)}
          postId={postId}
        />
      )}
    </>
  );
}
