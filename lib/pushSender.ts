import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { logServerError } from "@/lib/runtimeLogger";

const expo = new Expo();

/** Only these notification types trigger a device push (like Instagram) */
const PUSH_ENABLED_TYPES = new Set([
  "like", "comment", "reply", "comment_like",
  "follow", "follow_request", "follow_accepted", "mention",
  "device_login",
]);

// Per-user push cooldown: max 1 push per type per 2 minutes
const PUSH_COOLDOWN_MS = 2 * 60 * 1000;
const pushCooldowns = new Map<string, number>();
let _lastCleanup = Date.now();
function cleanupCooldowns() {
  const now = Date.now();
  if (now - _lastCleanup < 60_000) return;
  _lastCleanup = now;
  for (const [key, ts] of pushCooldowns) {
    if (now - ts > PUSH_COOLDOWN_MS) pushCooldowns.delete(key);
  }
}

interface SendPushParams {
  admin: SupabaseClient;
  user_id: string;
  actor_id: string;
  type: string;
  object_type?: string;
  object_id?: number;
  content?: string;
}

/**
 * Send push notification to all registered devices of a user.
 * Only fires for like, comment, reply, follow, follow_accepted, mention types.
 * Non-blocking — errors are logged but never thrown.
 */
export async function sendPushNotification({
  admin,
  user_id,
  actor_id,
  type,
  object_type,
  object_id,
  content,
}: SendPushParams): Promise<void> {
  try {
    if (!PUSH_ENABLED_TYPES.has(type)) return;

    // Push cooldown: max 1 push per user per type within 2 minutes
    cleanupCooldowns();
    const cooldownKey = `${user_id}:${type}`;
    const lastPush = pushCooldowns.get(cooldownKey);
    if (lastPush && Date.now() - lastPush < PUSH_COOLDOWN_MS) return;

    // Get all push tokens for this user
    const { data: tokens } = await admin
      .from("device_push_tokens")
      .select("token")
      .eq("user_id", user_id);

    if (!tokens || tokens.length === 0) return;

    // Get actor info for the push message
    const { data: actor } = await admin
      .from("profiles")
      .select("username, full_name")
      .eq("user_id", actor_id)
      .single();

    const actorName = actor?.full_name || actor?.username || "";

    // Build push body text
    const body = buildPushBody(type, actorName, content);
    if (!body) return;

    // Resolve post_slug for deep-link data
    let postSlug: string | undefined;
    if (object_type === "post" && object_id) {
      const { data: post } = await admin
        .from("posts")
        .select("slug")
        .eq("id", object_id)
        .single();
      postSlug = post?.slug || undefined;
    } else if (object_type === "comment" && object_id) {
      const { data: comment } = await admin
        .from("comments")
        .select("post_id")
        .eq("id", object_id)
        .single();
      if (comment?.post_id) {
        const { data: post } = await admin
          .from("posts")
          .select("slug")
          .eq("id", comment.post_id)
          .single();
        postSlug = post?.slug || undefined;
      }
    }

    // Build messages for each device token
    const messages: ExpoPushMessage[] = [];
    for (const { token } of tokens) {
      if (!Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        sound: "default",
        title: "Feedim",
        body,
        data: {
          type,
          username: actor?.username,
          post_slug: postSlug,
          object_id,
        },
      });
    }

    if (messages.length === 0) return;

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      // Clean up invalid tokens
      for (let i = 0; i < ticketChunk.length; i++) {
        const ticket = ticketChunk[i];
        if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
          // Token is stale — remove it
          await admin
            .from("device_push_tokens")
            .delete()
            .eq("token", (chunk[i] as ExpoPushMessage).to as string);
        }
      }
    }

    // Record cooldown after successful send
    pushCooldowns.set(cooldownKey, Date.now());
  } catch (e) {
    logServerError("[push] sendPushNotification failed", e, { type, user_id });
  }
}

function buildPushBody(type: string, actorName: string, content?: string): string | null {
  // Device login — show device info, not actor name
  if (type === "device_login") {
    return content ? `New login: ${content}` : "New login detected";
  }

  if (content) return `${actorName} ${content}`.trim();

  switch (type) {
    case "like":
    case "comment_like":
      return `${actorName} liked your post`;
    case "comment":
      return `${actorName} commented on your post`;
    case "reply":
      return `${actorName} replied to your comment`;
    case "mention":
      return `${actorName} mentioned you`;
    case "follow":
      return `${actorName} started following you`;
    case "follow_request":
      return `${actorName} wants to follow you`;
    case "follow_accepted":
      return `${actorName} accepted your follow request`;
    default:
      return null;
  }
}
