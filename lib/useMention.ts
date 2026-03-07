"use client";

import { useState, useRef, useCallback } from "react";
import { feedimAlert } from "@/components/FeedimAlert";
import { countMentions, extractMentions } from "@/lib/mentionRenderer";
import type { MentionUser } from "@/components/MentionDropdown";

interface UseMentionOptions {
  maxMentions?: number;
  limitMessage?: string;
}

interface UseMentionReturn {
  mentionUsers: MentionUser[];
  mentionIndex: number;
  setMentionIndex: React.Dispatch<React.SetStateAction<number>>;
  mentionDropdownTop: number | null;
  mentionQuery: string;
  mentionPos: number;
  mentionCount: number;
  isAtLimit: boolean;
  handleTextChange: (value: string, textarea: HTMLTextAreaElement | null) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  selectUser: (username: string, currentText: string, setText: (v: string, cursorPos: number) => void) => void;
  clearMention: () => void;
}

/**
 * Returns the caret line number (0-based) inside a textarea,
 * accounting for soft wraps by measuring with a mirror div.
 */
/** Returns top offset (px) for dropdown relative to a position:relative wrapper around the textarea. */
function getDropdownTop(textarea: HTMLTextAreaElement, pos: number): number {
  const cs = getComputedStyle(textarea);
  const lineHeight = parseFloat(cs.lineHeight) || 24;
  const paddingTop = parseFloat(cs.paddingTop) || 0;
  const lineNumber = textarea.value.substring(0, pos).split("\n").length - 1;
  return paddingTop + (lineNumber + 1) * lineHeight + 4 - textarea.scrollTop;
}

export function useMention({ maxMentions = 3, limitMessage }: UseMentionOptions = {}): UseMentionReturn {
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPos, setMentionPos] = useState(-1);
  const [mentionDropdownTop, setMentionDropdownTop] = useState<number | null>(null);
  const [mentionCount, setMentionCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (query: string, excludeUsernames: string[]) => {
    if (query.length < 1) {
      setMentionUsers([]);
      return;
    }
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&mention=1`);
      const data = await res.json();
      const excludeSet = new Set(excludeUsernames.map(u => u.toLowerCase()));
      const filtered = (data.users || []).filter((u: MentionUser) => !excludeSet.has(u.username.toLowerCase()));
      setMentionUsers(filtered);
      setMentionIndex(0);
    } catch {
      setMentionUsers([]);
    }
  }, []);

  const clearMention = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMentionUsers([]);
    setMentionQuery("");
    setMentionPos(-1);
    setMentionDropdownTop(null);
  }, []);

  const handleTextChange = useCallback(
    (value: string, textarea: HTMLTextAreaElement | null) => {
      const count = countMentions(value);
      setMentionCount(count);

      if (!textarea) return;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/(^|[^A-Za-z0-9._-])@(\w*)$/);

      if (mentionMatch) {
        // The currently-being-typed @query is included in count, so subtract 1
        // to get the number of already-completed mentions
        const completedMentions = Math.max(0, count - 1);
        if (completedMentions >= maxMentions) {
          if (limitMessage) feedimAlert("error", limitMessage);
          clearMention();
          return;
        }
        const query = mentionMatch[2];
        setMentionPos(cursorPos - query.length - 1);
        setMentionQuery(query);
        setMentionDropdownTop(getDropdownTop(textarea, cursorPos));
        // Get already-mentioned usernames to exclude from suggestions
        const alreadyMentioned = extractMentions(value, 999);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => searchUsers(query, alreadyMentioned), 200);
      } else {
        clearMention();
      }
    },
    [maxMentions, limitMessage, searchUsers, clearMention]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (mentionUsers.length === 0) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i < mentionUsers.length - 1 ? i + 1 : 0));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i > 0 ? i - 1 : mentionUsers.length - 1));
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        return true; // caller should call selectUser
      }
      if (e.key === "Escape") {
        clearMention();
        return true;
      }
      return false;
    },
    [mentionUsers.length, clearMention]
  );

  const selectUser = useCallback(
    (username: string, currentText: string, setText: (v: string, cursorPos: number) => void) => {
      if (mentionPos < 0) return;
      clearMention();
      const before = currentText.substring(0, mentionPos);
      const after = currentText.substring(mentionPos + 1 + mentionQuery.length);
      const inserted = "@" + username + " ";
      const newValue = before + inserted + after;
      setText(newValue, before.length + inserted.length);
    },
    [mentionPos, mentionQuery, clearMention]
  );

  return {
    mentionUsers,
    mentionIndex,
    setMentionIndex,
    mentionDropdownTop,
    mentionQuery,
    mentionPos,
    mentionCount,
    isAtLimit: mentionCount > maxMentions,
    handleTextChange,
    handleKeyDown,
    selectUser,
    clearMention,
  };
}
