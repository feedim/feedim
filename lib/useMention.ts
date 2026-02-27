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
  mentionDropdownTop: number | null;
  mentionQuery: string;
  mentionPos: number;
  mentionCount: number;
  isAtLimit: boolean;
  handleTextChange: (value: string, textarea: HTMLTextAreaElement | null) => void;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  selectUser: (username: string, currentText: string, setText: (v: string) => void) => void;
  clearMention: () => void;
}

function getCaretTop(textarea: HTMLTextAreaElement, pos: number): number {
  const mirror = document.createElement("div");
  const style = getComputedStyle(textarea);
  mirror.style.cssText = `position:absolute;top:0;left:0;visibility:hidden;white-space:pre-wrap;word-wrap:break-word;overflow:hidden;width:${style.width};font:${style.font};line-height:${style.lineHeight};padding:${style.padding};border:${style.border};letter-spacing:${style.letterSpacing};`;
  const textBefore = textarea.value.substring(0, pos);
  mirror.textContent = textBefore;
  const span = document.createElement("span");
  span.textContent = "|";
  mirror.appendChild(span);
  document.body.appendChild(mirror);
  const top = span.offsetTop - textarea.scrollTop;
  document.body.removeChild(mirror);
  return top;
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
          feedimAlert("error", limitMessage || "You can mention up to 3 people per post");
          clearMention();
          return;
        }
        const query = mentionMatch[2];
        setMentionPos(cursorPos - query.length - 1);
        setMentionQuery(query);
        const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 24;
        const caretTop = getCaretTop(textarea, cursorPos);
        setMentionDropdownTop(caretTop + lineHeight + 4);
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
    (username: string, currentText: string, setText: (v: string) => void) => {
      if (mentionPos < 0) return;
      clearMention();
      const before = currentText.substring(0, mentionPos);
      const after = currentText.substring(mentionPos + 1 + mentionQuery.length);
      const newValue = before + "@" + username + " " + after;
      setText(newValue);
    },
    [mentionPos, mentionQuery, clearMention]
  );

  return {
    mentionUsers,
    mentionIndex,
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
