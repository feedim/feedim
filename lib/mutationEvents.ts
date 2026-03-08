/**
 * Lightweight event bus for client-side cache synchronization.
 * After any mutation (like, comment, follow, save, delete, profile update),
 * dispatch an event so all listening components update instantly.
 */

import { invalidateCache } from "@/lib/fetchWithCache";

type MutationType =
  | "comment-added"
  | "comment-deleted"
  | "post-deleted"
  | "follow-changed"
  | "profile-updated"
  | "premium-changed";

interface MutationDetail {
  type: MutationType;
  postId?: number;
  username?: string;
  delta?: number; // +1 or -1 for counts
}

const EVENT_NAME = "fdm-mutation";

export function emitMutation(detail: MutationDetail): void {
  if (typeof window === "undefined") return;

  // Targeted cache invalidation based on mutation type
  switch (detail.type) {
    case "comment-added":
    case "comment-deleted":
      if (detail.postId) {
        invalidateCache(`/api/posts/${detail.postId}/comments`);
        invalidateCache(`/api/posts/${detail.postId}/stats`);
      }
      break;
    case "post-deleted":
      invalidateCache("/api/posts");
      invalidateCache("/internal/bookmarks");
      break;
    case "follow-changed":
      if (detail.username) {
        invalidateCache(`/api/users/${detail.username}`);
      }
      invalidateCache("/api/suggestions");
      invalidateCache("/api/profile");
      break;
    case "profile-updated":
      invalidateCache("/api/profile");
      break;
    case "premium-changed":
      invalidateCache("/api/profile");
      invalidateCache("/api/premium");
      invalidateCache("/api/monetization");
      break;
  }

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}

export function onMutation(callback: (detail: MutationDetail) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<MutationDetail>).detail);
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
