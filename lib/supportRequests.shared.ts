/**
 * Client-safe support request utilities.
 * These functions have NO server-only dependencies and can be used in "use client" components.
 */

export type SupportBugTopicId =
  | "account" | "login" | "password" | "profile" | "post"
  | "video" | "interaction" | "payment" | "moderation" | "notifications";

export interface ParsedSupportMessage {
  topicId: SupportBugTopicId | null;
  topicLabel: string | null;
  message: string;
  userReply: string | null;
  userReplyAt: string | null;
  userReplies: SupportUserReplyEntry[];
}

export interface SupportUserReplyEntry {
  message: string;
  createdAt: string | null;
}

const SUPPORT_MESSAGE_PREFIX = /^\[TOPIC:([a-z_]+)(?:\|([^\]]+))?\]\n\n?/i;
const SUPPORT_LEGACY_TOPIC_PREFIX = /^\[Konu\]\s*(.+?)\n\n?/i;
const SUPPORT_USER_REPLY_MARKER = /\[USER_REPLY:([^\]]+)\]\n\n?/g;
const SUPPORT_TOPIC_IDS: SupportBugTopicId[] = [
  "account", "login", "password", "profile", "post",
  "video", "interaction", "payment", "moderation", "notifications",
];

export function isSupportBugTopicId(value: string): value is SupportBugTopicId {
  return SUPPORT_TOPIC_IDS.includes(value as SupportBugTopicId);
}

export function sanitizeSupportMessage(input: string): string {
  return String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

export function parseSupportStoredMessage(input: string | null | undefined): ParsedSupportMessage {
  const raw = String(input || "");
  const next = raw.trim();
  let body = next;
  const userReplies: SupportUserReplyEntry[] = [];
  const replyMatches = Array.from(next.matchAll(SUPPORT_USER_REPLY_MARKER));
  if (replyMatches.length > 0) {
    const firstReplyIndex = replyMatches[0].index ?? -1;
    if (firstReplyIndex >= 0) {
      body = next.slice(0, firstReplyIndex).trim();
      for (let index = 0; index < replyMatches.length; index += 1) {
        const match = replyMatches[index];
        const start = (match.index ?? 0) + match[0].length;
        const end = index + 1 < replyMatches.length ? (replyMatches[index + 1].index ?? next.length) : next.length;
        const message = sanitizeSupportMessage(next.slice(start, end));
        if (!message) continue;
        userReplies.push({
          createdAt: match[1]?.trim() || null,
          message,
        });
      }
    }
  }
  const lastUserReply = userReplies.length > 0 ? userReplies[userReplies.length - 1] : null;

  const structured = body.match(SUPPORT_MESSAGE_PREFIX);
  if (structured) {
    const topicId = structured[1].toLowerCase();
    const topicLabel = structured[2]?.trim() || null;
    return {
      topicId: isSupportBugTopicId(topicId) ? topicId : null,
      topicLabel,
      message: sanitizeSupportMessage(body.replace(SUPPORT_MESSAGE_PREFIX, "")),
      userReply: lastUserReply?.message || null,
      userReplyAt: lastUserReply?.createdAt || null,
      userReplies,
    };
  }

  const legacy = body.match(SUPPORT_LEGACY_TOPIC_PREFIX);
  if (legacy) {
    return {
      topicId: null,
      topicLabel: legacy[1]?.trim() || null,
      message: sanitizeSupportMessage(body.replace(SUPPORT_LEGACY_TOPIC_PREFIX, "")),
      userReply: lastUserReply?.message || null,
      userReplyAt: lastUserReply?.createdAt || null,
      userReplies,
    };
  }

  return {
    topicId: null,
    topicLabel: null,
    message: sanitizeSupportMessage(body),
    userReply: lastUserReply?.message || null,
    userReplyAt: lastUserReply?.createdAt || null,
    userReplies,
  };
}
