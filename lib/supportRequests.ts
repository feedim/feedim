import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications";

export type SupportRequestKind = "moderation_appeal" | "bug_report" | "other";
export type SupportRequestStatus = "open" | "in_review" | "resolved" | "rejected";
export type SupportBugTopicId =
  | "account"
  | "login"
  | "password"
  | "profile"
  | "post"
  | "video"
  | "interaction"
  | "payment"
  | "moderation"
  | "notifications";

export interface SupportDecisionOption {
  decisionCode: string;
  decision: string | null;
  reason: string | null;
  targetType: string;
  targetId: string;
  createdAt: string | null;
}

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

export interface ParsedSupportReviewerNote {
  mode: "final" | "await_user";
  message: string;
  deadlineAt: string | null;
}

export interface SupportReviewerThreadEntry {
  mode: "final" | "await_user";
  message: string;
  deadlineAt: string | null;
  createdAt: string | null;
}

const SUPPORT_MESSAGE_PREFIX = /^\[TOPIC:([a-z_]+)(?:\|([^\]]+))?\]\n\n?/i;
const SUPPORT_LEGACY_TOPIC_PREFIX = /^\[Konu\]\s*(.+?)\n\n?/i;
const SUPPORT_USER_REPLY_MARKER = /\[USER_REPLY:([^\]]+)\]\n\n?/g;
const SUPPORT_REVIEWER_NOTE_PREFIX = /^\[STATE:(await_user|final)(?:\|([^\]]+))?\]\n\n?/i;
const SUPPORT_REVIEWER_THREAD_PREFIX = /^\[THREAD\]\n?/i;
const SUPPORT_REVIEWER_THREAD_ITEM_MARKER = /\[ITEM:(await_user|final)\|([^|\]]+)(?:\|([^\]]*))?\]\n\n?/g;
const SUPPORT_TOPIC_IDS: SupportBugTopicId[] = [
  "account",
  "login",
  "password",
  "profile",
  "post",
  "video",
  "interaction",
  "payment",
  "moderation",
  "notifications",
];

export function isSupportBugTopicId(value: string): value is SupportBugTopicId {
  return SUPPORT_TOPIC_IDS.includes(value as SupportBugTopicId);
}

export function normalizeDecisionCode(input: string): string {
  return String(input || "")
    .trim()
    .replace(/\D/g, "")
    .slice(0, 12);
}

export function sanitizeSupportMessage(input: string): string {
  return String(input || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

export function encodeSupportStoredMessage(params: {
  topicId?: SupportBugTopicId | null;
  topicLabel?: string | null;
  message: string;
}) {
  const message = sanitizeSupportMessage(params.message);
  if (!params.topicId) return message;
  const safeLabel = String(params.topicLabel || "")
    .replace(/\r?\n/g, " ")
    .replace(/[|\]]/g, "")
    .trim()
    .slice(0, 120);
  return `[TOPIC:${params.topicId}${safeLabel ? `|${safeLabel}` : ""}]\n\n${message}`.slice(0, 4000);
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

export function encodeSupportUserReply(
  storedMessage: string | null | undefined,
  reply: string,
  replyAt = new Date().toISOString(),
) {
  const parsed = parseSupportStoredMessage(storedMessage);
  const base = encodeSupportStoredMessage({
    topicId: parsed.topicId,
    topicLabel: parsed.topicLabel,
    message: parsed.message,
  });
  const existingReplies = parsed.userReplies.map((entry) =>
    `[USER_REPLY:${entry.createdAt || replyAt}]\n\n${sanitizeSupportMessage(entry.message)}`,
  );
  const nextReply = `[USER_REPLY:${replyAt}]\n\n${sanitizeSupportMessage(reply)}`;
  return [base, ...existingReplies, nextReply].join("\n\n").slice(0, 4000);
}

export function encodeSupportReviewerNote(params: {
  mode: "final" | "await_user";
  message: string;
  deadlineAt?: string | null;
}) {
  const message = sanitizeSupportMessage(params.message);
  const suffix = params.mode === "await_user" && params.deadlineAt
    ? `|${params.deadlineAt}`
    : "";
  return `[STATE:${params.mode}${suffix}]\n\n${message}`.slice(0, 4000);
}

export function encodeSupportReviewerThread(entries: SupportReviewerThreadEntry[]) {
  const encodedEntries = entries.map((entry) => {
    const message = sanitizeSupportMessage(entry.message);
    const createdAt = entry.createdAt || new Date().toISOString();
    const deadlinePart = entry.mode === "await_user" && entry.deadlineAt ? `|${entry.deadlineAt}` : "";
    return `[ITEM:${entry.mode}|${createdAt}${deadlinePart}]\n\n${message}`;
  });

  return [`[THREAD]`, ...encodedEntries].join("\n\n").slice(0, 4000);
}

function parseLegacySupportReviewerNote(input: string | null | undefined): ParsedSupportReviewerNote {
  const raw = sanitizeSupportMessage(String(input || ""));
  const structured = raw.match(SUPPORT_REVIEWER_NOTE_PREFIX);
  if (!structured) {
    return {
      mode: "final",
      deadlineAt: null,
      message: raw,
    };
  }

  return {
    mode: structured[1] === "await_user" ? "await_user" : "final",
    deadlineAt: structured[2]?.trim() || null,
    message: sanitizeSupportMessage(raw.replace(SUPPORT_REVIEWER_NOTE_PREFIX, "")),
  };
}

export function parseSupportReviewerThread(input: string | null | undefined): SupportReviewerThreadEntry[] {
  const raw = String(input || "").trim();
  if (!raw) return [];

  if (!SUPPORT_REVIEWER_THREAD_PREFIX.test(raw)) {
    const single = parseLegacySupportReviewerNote(raw);
    if (!single.message) return [];
    return [{
      mode: single.mode,
      message: single.message,
      deadlineAt: single.deadlineAt,
      createdAt: null,
    }];
  }

  const body = raw.replace(SUPPORT_REVIEWER_THREAD_PREFIX, "");
  const matches = Array.from(body.matchAll(SUPPORT_REVIEWER_THREAD_ITEM_MARKER));
  if (matches.length === 0) return [];

  const entries: SupportReviewerThreadEntry[] = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index ?? 0;
    const nextStart = index + 1 < matches.length ? (matches[index + 1].index ?? body.length) : body.length;
    const fullMatch = match[0];
    const messageStart = start + fullMatch.length;
    const message = sanitizeSupportMessage(body.slice(messageStart, nextStart));
    entries.push({
      mode: match[1] === "await_user" ? "await_user" : "final",
      createdAt: match[2] || null,
      deadlineAt: match[3]?.trim() ? match[3].trim() : null,
      message,
    });
  }

  return entries.filter((entry) => entry.message.length > 0);
}

export function appendSupportReviewerNote(
  existing: string | null | undefined,
  params: {
    mode: "final" | "await_user";
    message: string;
    deadlineAt?: string | null;
    createdAt?: string | null;
  },
) {
  const nextEntry: SupportReviewerThreadEntry = {
    mode: params.mode,
    message: sanitizeSupportMessage(params.message),
    deadlineAt: params.mode === "await_user" ? (params.deadlineAt || null) : null,
    createdAt: params.createdAt || new Date().toISOString(),
  };

  const existingEntries = parseSupportReviewerThread(existing);
  if (existingEntries.length === 0) {
    return encodeSupportReviewerNote({
      mode: nextEntry.mode,
      message: nextEntry.message,
      deadlineAt: nextEntry.deadlineAt,
    });
  }

  return encodeSupportReviewerThread([...existingEntries, nextEntry]);
}

export function parseSupportReviewerNote(input: string | null | undefined): ParsedSupportReviewerNote {
  const raw = String(input || "").trim();
  if (SUPPORT_REVIEWER_THREAD_PREFIX.test(raw)) {
    const threaded = parseSupportReviewerThread(raw);
    const last = threaded[threaded.length - 1];
    if (!last) {
      return {
        mode: "final",
        deadlineAt: null,
        message: "",
      };
    }
    return {
      mode: last.mode,
      deadlineAt: last.deadlineAt,
      message: last.message,
    };
  }
  return parseLegacySupportReviewerNote(raw);
}

export function isSupportAwaitingUserReply(input: string | null | undefined) {
  const parsed = parseSupportReviewerNote(input);
  return parsed.mode === "await_user";
}

export function isSupportReplyWindowExpired(input: string | null | undefined, now = Date.now()) {
  const parsed = parseSupportReviewerNote(input);
  if (parsed.mode !== "await_user" || !parsed.deadlineAt) return false;
  const deadline = new Date(parsed.deadlineAt).getTime();
  if (Number.isNaN(deadline)) return false;
  return deadline <= now;
}

export async function finalizeExpiredSupportRequests(
  admin: ReturnType<typeof createAdminClient>,
  options?: {
    userId?: string;
    notificationContent?: string;
  },
) {
  let query = admin
    .from("support_requests")
    .select("id, user_id, status, reviewer_note")
    .eq("status", "in_review")
    .not("reviewer_note", "is", null)
    .order("updated_at", { ascending: true })
    .limit(100);

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data } = await query;
  const finalizedIds: number[] = [];

  for (const item of data || []) {
    if (!isSupportReplyWindowExpired(item.reviewer_note)) continue;
    const parsedNote = parseSupportReviewerNote(item.reviewer_note);
    const nextReviewerNote = encodeSupportReviewerNote({
      mode: "final",
      message: parsedNote.message,
    });

    const { error } = await admin
      .from("support_requests")
      .update({
        status: "resolved",
        reviewer_note: nextReviewerNote,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("status", "in_review");

    if (error) continue;
    finalizedIds.push(Number(item.id));

    if (options?.notificationContent) {
      await createNotification({
        admin,
        user_id: item.user_id,
        actor_id: item.user_id,
        type: "system",
        object_type: "support_request",
        object_id: Number(item.id),
        content: options.notificationContent,
      });
    }
  }

  return finalizedIds;
}

export async function cleanupResolvedSupportRequests(
  admin: ReturnType<typeof createAdminClient>,
  options?: {
    userId?: string;
    olderThanDays?: number;
  },
) {
  const olderThanDays = Math.max(1, options?.olderThanDays || 14);
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  let query = admin
    .from("support_requests")
    .select("id")
    .in("status", ["resolved", "rejected"])
    .lt("reviewed_at", cutoff)
    .order("reviewed_at", { ascending: true })
    .limit(200);

  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }

  const { data } = await query;
  const requestIds = (data || [])
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (requestIds.length === 0) {
    return [];
  }

  await admin
    .from("notifications")
    .delete()
    .eq("object_type", "support_request")
    .in("object_id", requestIds);

  const { data: deleted } = await admin
    .from("support_requests")
    .delete()
    .in("id", requestIds)
    .select("id");

  return (deleted || [])
    .map((row) => Number(row.id))
    .filter((value) => Number.isFinite(value) && value > 0);
}

export function normalizeSupportUrl(input: string | null | undefined): string | null {
  const value = String(input || "").trim();
  if (!value) return null;

  try {
    const normalizedValue = /^http:\/\//i.test(value)
      ? value.replace(/^http:\/\//i, "https://")
      : value;
    const url = new URL(normalizedValue);
    if (url.protocol !== "https:") return null;
    return url.toString().slice(0, 1000);
  } catch {
    return null;
  }
}

async function listDecisionRowsForTarget(
  admin: ReturnType<typeof createAdminClient>,
  targetType: string,
  targetIds: string[],
) {
  if (targetIds.length === 0) return [];
  const rows: Array<Record<string, unknown>> = [];
  const chunkSize = 200;

  for (let index = 0; index < targetIds.length; index += chunkSize) {
    const chunk = targetIds.slice(index, index + chunkSize);
    const { data } = await admin
      .from("moderation_decisions")
      .select("decision_code, decision, reason, target_type, target_id, created_at")
      .eq("target_type", targetType)
      .in("target_id", chunk)
      .not("decision_code", "is", null)
      .order("created_at", { ascending: false });

    if (data?.length) {
      rows.push(...(data as Array<Record<string, unknown>>));
    }
  }

  return rows;
}

async function listOwnedIds(
  admin: ReturnType<typeof createAdminClient>,
  table: string,
  idColumn: string,
  ownerColumn: string,
  ownerValue: string,
  maxRows = 5000,
) {
  const { data } = await admin
    .from(table)
    .select(idColumn)
    .eq(ownerColumn, ownerValue)
    .range(0, Math.max(0, maxRows - 1));

  return ((data || []) as unknown as Array<Record<string, unknown>>).map((row) => String(row[idColumn]));
}

async function listCommentIdsForPostIds(
  admin: ReturnType<typeof createAdminClient>,
  postIds: string[],
  maxRows = 8000,
) {
  if (postIds.length === 0) return [];

  const ids: string[] = [];
  const chunkSize = 200;

  for (let index = 0; index < postIds.length && ids.length < maxRows; index += chunkSize) {
    const chunk = postIds.slice(index, index + chunkSize);
    const remaining = Math.max(0, maxRows - ids.length);
    const { data } = await admin
      .from("comments")
      .select("id")
      .in("post_id", chunk)
      .range(0, Math.max(0, remaining - 1));

    if (data?.length) {
      ids.push(...data.map((row) => String(row.id)));
    }
  }

  return ids;
}

async function decisionBelongsToUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  targetType: string,
  targetId: string,
): Promise<boolean> {
  switch (targetType) {
    case "user":
      return targetId === userId;
    case "post": {
      const { data } = await admin
        .from("posts")
        .select("author_id")
        .eq("id", Number(targetId))
        .single();
      return data?.author_id === userId;
    }
    case "comment": {
      const { data } = await admin
        .from("comments")
        .select("author_id, post_id")
        .eq("id", Number(targetId))
        .single();
      if (!data) return false;
      if (data.author_id === userId) return true;
      if (!data.post_id) return false;

      const { data: post } = await admin
        .from("posts")
        .select("author_id")
        .eq("id", data.post_id)
        .single();
      return post?.author_id === userId;
    }
    case "withdrawal": {
      const { data } = await admin
        .from("withdrawal_requests")
        .select("user_id")
        .eq("id", Number(targetId))
        .single();
      return data?.user_id === userId;
    }
    case "boost": {
      const { data } = await admin
        .from("post_boosts")
        .select("user_id")
        .eq("id", Number(targetId))
        .single();
      return data?.user_id === userId;
    }
    case "copyright_application": {
      const { data } = await admin
        .from("copyright_applications")
        .select("user_id")
        .eq("id", Number(targetId))
        .single();
      return data?.user_id === userId;
    }
    default:
      return false;
  }
}

export async function resolveOwnedModerationDecision(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  decisionCode: string,
) {
  const normalized = normalizeDecisionCode(decisionCode);
  if (!normalized) return null;

  const { data: decision } = await admin
    .from("moderation_decisions")
    .select("decision_code, decision, reason, target_type, target_id, created_at")
    .eq("decision_code", normalized)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!decision?.target_type || !decision?.target_id) {
    return null;
  }

  const belongsToUser = await decisionBelongsToUser(
    admin,
    userId,
    String(decision.target_type),
    String(decision.target_id),
  );

  if (!belongsToUser) return null;

  return {
    decisionCode: decision.decision_code as string,
    decision: decision.decision as string | null,
    reason: decision.reason as string | null,
    targetType: String(decision.target_type),
    targetId: String(decision.target_id),
    createdAt: decision.created_at as string | null,
  };
}

export async function listOwnedAppealableDecisions(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<SupportDecisionOption[]> {
  const postIds = await listOwnedIds(admin, "posts", "id", "author_id", userId, 3000);

  const [
    authoredCommentIds,
    postOwnedCommentIds,
    withdrawalIds,
    boostIds,
    copyrightApplicationIds,
    existingAppealsResult,
    directUserDecisions,
  ] = await Promise.all([
    listOwnedIds(admin, "comments", "id", "author_id", userId, 8000),
    listCommentIdsForPostIds(admin, postIds, 8000),
    listOwnedIds(admin, "withdrawal_requests", "id", "user_id", userId, 1000),
    listOwnedIds(admin, "post_boosts", "id", "user_id", userId, 1000),
    listOwnedIds(admin, "copyright_applications", "id", "user_id", userId, 1000),
    admin
      .from("support_requests")
      .select("decision_code")
      .eq("user_id", userId)
      .eq("kind", "moderation_appeal")
      .not("decision_code", "is", null),
    listDecisionRowsForTarget(admin, "user", [userId]),
  ]);

  const commentIds = Array.from(new Set([...authoredCommentIds, ...postOwnedCommentIds]));

  const [postDecisions, commentDecisions, withdrawalDecisions, boostDecisions, copyrightAppDecisions] =
    await Promise.all([
      listDecisionRowsForTarget(admin, "post", postIds),
      listDecisionRowsForTarget(admin, "comment", commentIds),
      listDecisionRowsForTarget(admin, "withdrawal", withdrawalIds),
      listDecisionRowsForTarget(admin, "boost", boostIds),
      listDecisionRowsForTarget(admin, "copyright_application", copyrightApplicationIds),
    ]);

  const appealedCodes = new Set(
    (existingAppealsResult.data || [])
      .map(({ decision_code }) => normalizeDecisionCode(String(decision_code || "")))
      .filter(Boolean),
  );

  const uniqueByCode = new Map<string, SupportDecisionOption>();
  const allRows = [
    ...directUserDecisions,
    ...postDecisions,
    ...commentDecisions,
    ...withdrawalDecisions,
    ...boostDecisions,
    ...copyrightAppDecisions,
  ];

  for (const row of allRows) {
    const decisionCode = normalizeDecisionCode(String(row.decision_code || ""));
    if (!decisionCode || appealedCodes.has(decisionCode) || uniqueByCode.has(decisionCode)) {
      continue;
    }

    uniqueByCode.set(decisionCode, {
      decisionCode,
      decision: row.decision as string | null,
      reason: row.reason as string | null,
      targetType: String(row.target_type),
      targetId: String(row.target_id),
      createdAt: row.created_at as string | null,
    });
  }

  return Array.from(uniqueByCode.values()).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}
