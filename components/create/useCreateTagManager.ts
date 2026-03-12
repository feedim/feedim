"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { feedimAlert } from "@/components/FeedimAlert";
import { VALIDATION } from "@/lib/constants";
import { sanitizeTagInput } from "@/lib/utils";
import type { CreateTag } from "@/components/create/types";

interface CreateTagManagerMessages {
  tagMinLength: (min: number) => string;
  tagMaxLength: (max: number) => string;
  tagInvalidChars: string;
  tagOnlyNumbers: string;
  tagCreateFailed: string;
  tagCreateFailedRetry: string;
}

export function useCreateTagManager(messages: CreateTagManagerMessages) {
  const tagAutocompleteRef = useRef<HTMLDivElement>(null);
  const [tags, setTags] = useState<CreateTag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<CreateTag[]>([]);
  const [tagHighlight, setTagHighlight] = useState(-1);
  const [tagCreating, setTagCreating] = useState(false);

  const searchTags = useCallback(async (query: string) => {
    if (query.trim().length < 1) {
      setTagSuggestions([]);
      setTagHighlight(-1);
      return;
    }

    try {
      const res = await fetch(`/api/tags?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTagSuggestions(
        (data.tags || [])
          .filter(
            (tag: CreateTag) =>
              !tags.some(
                (existing) =>
                  existing.id === tag.id || existing.slug === tag.slug,
              ),
          )
          .slice(0, 5),
      );
      setTagHighlight(-1);
    } catch {
      setTagSuggestions([]);
    }
  }, [tags]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void searchTags(tagSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [tagSearch, searchTags]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!tagAutocompleteRef.current?.contains(event.target as Node)) {
        setTagSuggestions([]);
        setTagHighlight(-1);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const addTag = useCallback((tag: CreateTag) => {
    if (tags.length >= VALIDATION.postTags.max) return;
    if (
      tags.some(
        (existing) =>
          existing.id === tag.id ||
          existing.slug === tag.slug ||
          existing.name === tag.name,
      )
    ) {
      return;
    }

    setTags((prev) => [...prev, tag]);
    setTagSearch("");
    setTagSuggestions([]);
    setTagHighlight(-1);
  }, [tags]);

  const createAndAddTag = useCallback(async () => {
    const trimmed = sanitizeTagInput(tagSearch).trim();
    if (!trimmed || tags.length >= VALIDATION.postTags.max || tagCreating) return;

    if (trimmed.length < VALIDATION.tagName.min) {
      feedimAlert("error", messages.tagMinLength(VALIDATION.tagName.min));
      return;
    }
    if (trimmed.length > VALIDATION.tagName.max) {
      feedimAlert("error", messages.tagMaxLength(VALIDATION.tagName.max));
      return;
    }
    if (!VALIDATION.tagName.pattern.test(trimmed)) {
      feedimAlert("error", messages.tagInvalidChars);
      return;
    }
    if (/^\d+$/.test(trimmed)) {
      feedimAlert("error", messages.tagOnlyNumbers);
      return;
    }

    setTagCreating(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.tag) {
        addTag(data.tag);
      } else {
        feedimAlert("error", data.error || messages.tagCreateFailed);
      }
    } catch {
      feedimAlert("error", messages.tagCreateFailedRetry);
    } finally {
      setTagCreating(false);
    }
  }, [addTag, messages, tagCreating, tagSearch, tags.length]);

  const removeTag = useCallback((tagId: number | string) => {
    setTags((prev) => prev.filter((tag) => tag.id !== tagId));
  }, []);

  const handleTagKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key.length === 1 &&
      sanitizeTagInput(event.key) === ""
    ) {
      event.preventDefault();
      return;
    }

    if (tagSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setTagHighlight((prev) =>
          prev < tagSuggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setTagHighlight((prev) =>
          prev > 0 ? prev - 1 : tagSuggestions.length - 1,
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (tagHighlight >= 0 && tagHighlight < tagSuggestions.length) {
          addTag(tagSuggestions[tagHighlight]);
        } else if (tagSearch.trim()) {
          void createAndAddTag();
        }
      } else if (event.key === "Escape") {
        setTagSuggestions([]);
        setTagHighlight(-1);
      }
    } else if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (tagSearch.trim()) {
        void createAndAddTag();
      }
    }
  }, [addTag, createAndAddTag, tagHighlight, tagSearch, tagSuggestions]);

  const handleTagSearchChange = useCallback((value: string) => {
    setTagSearch(sanitizeTagInput(value));
  }, []);

  const handleTagFocus = useCallback(() => {
    if (tagSearch.trim()) {
      void searchTags(tagSearch);
    }
  }, [searchTags, tagSearch]);

  return {
    tagAutocompleteRef,
    tags,
    setTags,
    tagSearch,
    tagSuggestions,
    tagHighlight,
    tagCreating,
    addTag,
    createAndAddTag,
    removeTag,
    handleTagKeyDown,
    handleTagSearchChange,
    handleTagFocus,
    setTagHighlight,
  };
}
