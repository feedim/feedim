"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { feedimAlert } from "@/components/FeedimAlert";
import { readPostInteraction, subscribePostInteractions, writePostInteraction } from "@/lib/postInteractionStore";
import type { InteractionResponse, Moment } from "@/components/moments/types";

interface UseMomentsInteractionsOptions {
  isLoggedIn: boolean;
  viewerId?: string;
  moments: Moment[];
  setMoments: Dispatch<SetStateAction<Moment[]>>;
  requireAuth: () => boolean;
  errors: {
    likeLimitReached: string;
    saveLimitReached: string;
  };
}

export function useMomentsInteractions({
  isLoggedIn,
  viewerId,
  moments,
  setMoments,
  requireAuth,
  errors,
}: UseMomentsInteractionsOptions) {
  const [likedSet, setLikedSet] = useState<Set<number>>(new Set());
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());

  const applyStoredInteractionToMoment = useCallback((moment: Moment): Moment => {
    if (!viewerId) return moment;

    const stored = readPostInteraction(viewerId, moment.id);
    if (!stored) return moment;

    return {
      ...moment,
      viewer_liked: typeof stored.liked === "boolean" ? stored.liked : moment.viewer_liked,
      viewer_saved: typeof stored.saved === "boolean" ? stored.saved : moment.viewer_saved,
      like_count: typeof stored.likeCount === "number" ? stored.likeCount : moment.like_count,
      save_count: typeof stored.saveCount === "number" ? stored.saveCount : moment.save_count,
    };
  }, [viewerId]);

  const applyStoredInteractions = useCallback((items: Moment[]) => (
    viewerId ? items.map((moment) => applyStoredInteractionToMoment(moment)) : items
  ), [applyStoredInteractionToMoment, viewerId]);

  const seedMomentInteractions = useCallback((items: Moment[]) => {
    const likedIds = items.filter((item) => item.viewer_liked === true).map((item) => item.id);
    const savedIds = items.filter((item) => item.viewer_saved === true).map((item) => item.id);

    if (likedIds.length > 0) {
      setLikedSet((prev) => {
        const next = new Set(prev);
        likedIds.forEach((id) => next.add(id));
        return next;
      });
    }

    if (savedIds.length > 0) {
      setSavedSet((prev) => {
        const next = new Set(prev);
        savedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, []);

  const hydrateInteractions = useCallback((items: Moment[]) => {
    const itemsWithOverrides = applyStoredInteractions(items);
    seedMomentInteractions(itemsWithOverrides);

    if (!isLoggedIn || itemsWithOverrides.length === 0) return;
    const ids = itemsWithOverrides
      .filter((item) => typeof item.viewer_liked !== "boolean" || typeof item.viewer_saved !== "boolean")
      .map((item) => item.id)
      .slice(0, 50);
    if (ids.length === 0) return;

    fetch(`/api/posts/batch-interactions?ids=${ids.join(",")}`)
      .then((response) => response.json())
      .then((data: InteractionResponse) => {
        if (!data.interactions) return;

        const liked = new Set<number>();
        const saved = new Set<number>();
        for (const [id, status] of Object.entries(data.interactions)) {
          if (status.liked) liked.add(Number(id));
          if (status.saved) saved.add(Number(id));
        }

        setLikedSet((prev) => {
          const next = new Set(prev);
          liked.forEach((id) => next.add(id));
          return next;
        });
        setSavedSet((prev) => {
          const next = new Set(prev);
          saved.forEach((id) => next.add(id));
          return next;
        });
        setMoments((prev) => applyStoredInteractions(prev.map((moment) => {
          const status = data.interactions?.[String(moment.id)];
          if (!status) return moment;
          return {
            ...moment,
            viewer_liked: status.liked === true,
            viewer_saved: status.saved === true,
          };
        })));
      })
      .catch(() => {});
  }, [applyStoredInteractions, isLoggedIn, seedMomentInteractions, setMoments]);

  useEffect(() => {
    if (!viewerId) return;

    return subscribePostInteractions((detail) => {
      if (detail.viewerId !== viewerId) return;

      if (typeof detail.value?.liked === "boolean") {
        setLikedSet((prev) => {
          const next = new Set(prev);
          if (detail.value?.liked) next.add(detail.postId);
          else next.delete(detail.postId);
          return next;
        });
      }

      if (typeof detail.value?.saved === "boolean") {
        setSavedSet((prev) => {
          const next = new Set(prev);
          if (detail.value?.saved) next.add(detail.postId);
          else next.delete(detail.postId);
          return next;
        });
      }

      setMoments((prev) => prev.map((moment) => {
        if (moment.id !== detail.postId) return moment;

        return {
          ...moment,
          viewer_liked: typeof detail.value?.liked === "boolean" ? detail.value.liked : moment.viewer_liked,
          viewer_saved: typeof detail.value?.saved === "boolean" ? detail.value.saved : moment.viewer_saved,
          like_count: typeof detail.value?.likeCount === "number" ? detail.value.likeCount : moment.like_count,
          save_count: typeof detail.value?.saveCount === "number" ? detail.value.saveCount : moment.save_count,
        };
      }));
    });
  }, [setMoments, viewerId]);

  const isMomentLiked = useCallback((moment: Moment) => (
    likedSet.has(moment.id) || moment.viewer_liked === true
  ), [likedSet]);

  const isMomentSaved = useCallback((moment: Moment) => (
    savedSet.has(moment.id) || moment.viewer_saved === true
  ), [savedSet]);

  const handleLike = useCallback((momentId: number) => {
    if (!requireAuth() || !viewerId) return;

    const currentMoment = moments.find((moment) => moment.id === momentId);
    const wasLiked = currentMoment ? isMomentLiked(currentMoment) : likedSet.has(momentId);
    const nextLikeCount = Math.max(0, (currentMoment?.like_count || 0) + (wasLiked ? -1 : 1));

    setLikedSet((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(momentId);
      else next.add(momentId);
      return next;
    });
    setMoments((prev) => prev.map((moment) =>
      moment.id === momentId ? { ...moment, viewer_liked: !wasLiked, like_count: nextLikeCount } : moment
    ));
    writePostInteraction(viewerId, momentId, {
      liked: !wasLiked,
      likeCount: nextLikeCount,
    });

    fetch(`/api/posts/${momentId}/like`, { method: "POST", keepalive: true })
      .then((response) => {
        if (!response.ok) throw response;
      })
      .catch(async (error) => {
        const rollbackLikeCount = Math.max(0, nextLikeCount + (wasLiked ? 1 : -1));
        setLikedSet((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(momentId);
          else next.delete(momentId);
          return next;
        });
        setMoments((prev) => prev.map((moment) =>
          moment.id === momentId ? { ...moment, viewer_liked: wasLiked, like_count: rollbackLikeCount } : moment
        ));
        writePostInteraction(viewerId, momentId, {
          liked: wasLiked,
          likeCount: rollbackLikeCount,
        });

        if (error instanceof Response && (error.status === 403 || error.status === 429)) {
          const data = await error.json().catch(() => ({}));
          feedimAlert("error", data.error || errors.likeLimitReached);
        }
      });
  }, [errors.likeLimitReached, isMomentLiked, likedSet, moments, requireAuth, setMoments, viewerId]);

  const handleSave = useCallback((momentId: number) => {
    if (!requireAuth() || !viewerId) return;

    const currentMoment = moments.find((moment) => moment.id === momentId);
    const wasSaved = currentMoment ? isMomentSaved(currentMoment) : savedSet.has(momentId);
    const nextSaveCount = Math.max(0, (currentMoment?.save_count || 0) + (wasSaved ? -1 : 1));

    setSavedSet((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(momentId);
      else next.add(momentId);
      return next;
    });
    setMoments((prev) => prev.map((moment) =>
      moment.id === momentId ? { ...moment, viewer_saved: !wasSaved, save_count: nextSaveCount } : moment
    ));
    writePostInteraction(viewerId, momentId, {
      saved: !wasSaved,
      saveCount: nextSaveCount,
    });

    fetch(`/api/posts/${momentId}/save`, { method: "POST", keepalive: true })
      .then((response) => {
        if (!response.ok) throw response;
      })
      .catch(async (error) => {
        const rollbackSaveCount = Math.max(0, nextSaveCount + (wasSaved ? 1 : -1));
        setSavedSet((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(momentId);
          else next.delete(momentId);
          return next;
        });
        setMoments((prev) => prev.map((moment) =>
          moment.id === momentId ? { ...moment, viewer_saved: wasSaved, save_count: rollbackSaveCount } : moment
        ));
        writePostInteraction(viewerId, momentId, {
          saved: wasSaved,
          saveCount: rollbackSaveCount,
        });

        if (error instanceof Response && (error.status === 403 || error.status === 429)) {
          const data = await error.json().catch(() => ({}));
          feedimAlert("error", data.error || errors.saveLimitReached);
        }
      });
  }, [errors.saveLimitReached, isMomentSaved, moments, requireAuth, savedSet, setMoments, viewerId]);

  return {
    applyStoredInteractions,
    hydrateInteractions,
    isMomentLiked,
    isMomentSaved,
    handleLike,
    handleSave,
  };
}
