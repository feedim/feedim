"use client";

import type { CreateTag } from "@/components/create/types";
import { VALIDATION } from "@/lib/constants";

const HASHTAG_REGEX =
  /#([A-Za-z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FFğüşıöçĞÜŞİÖÇəƏ_]+)/g;

type ExtractHashtagsResult = {
  cleanedText: string;
  tags: CreateTag[];
  foundHashtags: boolean;
  tagsChanged: boolean;
};

export function stripHashtags(text: string) {
  return text.replace(HASHTAG_REGEX, "").replace(/  +/g, " ").trim();
}

export async function extractHashtagsToTags(
  text: string,
  tags: CreateTag[],
): Promise<ExtractHashtagsResult> {
  const matches = [...text.matchAll(HASHTAG_REGEX)];
  if (matches.length === 0) {
    return {
      cleanedText: text,
      tags,
      foundHashtags: false,
      tagsChanged: false,
    };
  }

  const nextTags = [...tags];
  const existingNames = new Set(nextTags.map((tag) => tag.name.toLowerCase()));

  for (const match of matches) {
    const name = match[1];
    if (name.length < VALIDATION.tagName.min) continue;
    if (/^\d+$/.test(name)) continue;
    if (existingNames.has(name.toLowerCase())) continue;
    if (nextTags.length >= VALIDATION.postTags.max) break;

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.tag) {
        nextTags.push(data.tag);
        existingNames.add(name.toLowerCase());
      }
    } catch {
      // Best-effort enhancement; keep the original text flow intact on failure.
    }
  }

  return {
    cleanedText: stripHashtags(text),
    tags: nextTags,
    foundHashtags: true,
    tagsChanged: nextTags.length !== tags.length,
  };
}
