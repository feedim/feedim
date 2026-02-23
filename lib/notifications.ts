import { SupabaseClient } from "@supabase/supabase-js";

interface CreateNotificationParams {
  admin: SupabaseClient;
  user_id: string;
  actor_id: string;
  type: string;
  object_type?: string;
  object_id?: number;
  content?: string;
}

/**
 * Create a notification with 24-hour duplicate prevention.
 * Same actor + type + object = skip within 24 hours.
 */
export async function createNotification({
  admin,
  user_id,
  actor_id,
  type,
  object_type,
  object_id,
  content,
}: CreateNotificationParams) {
  // Don't notify yourself (except for milestone/system notifications)
  const selfNotifyTypes = ['milestone', 'system', 'coin_earned', 'premium_expired', 'moderation_approved', 'moderation_rejected', 'moderation_review', 'account_moderation', 'copyright_detected', 'copyright_claim_submitted', 'copyright_verified', 'copyright_rejected', 'copyright_verification_needed', 'copyright_similar_detected', 'copyright_application_approved', 'copyright_application_rejected', 'copyright_revoked'];
  if (user_id === actor_id && !selfNotifyTypes.includes(type)) return;

  // Check user's notification settings
  const { data: profile } = await admin
    .from("profiles")
    .select("notification_settings, notifications_paused_until")
    .eq("user_id", user_id)
    .single();

  if (profile) {
    // Check if notifications are paused
    if (profile.notifications_paused_until && new Date(profile.notifications_paused_until) > new Date()) {
      return;
    }
    // Check if this notification type is disabled
    if (profile.notification_settings && profile.notification_settings[type] === false) {
      return;
    }
  }

  // Duplicate prevention: same actor + type + object within 24 hours
  // Skip duplicate check for account_moderation (status can change multiple times)
  const skipDupeTypes = ['account_moderation', 'copyright_similar_detected'];
  if (!skipDupeTypes.includes(type)) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let dupeQuery = admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .eq("actor_id", actor_id)
      .eq("type", type)
      .gte("created_at", twentyFourHoursAgo);

    if (object_id !== undefined) {
      dupeQuery = dupeQuery.eq("object_id", object_id);
    }

    const { count } = await dupeQuery;
    if (count && count > 0) return;
  }

  const record: Record<string, unknown> = { user_id, actor_id, type };
  if (object_type) record.object_type = object_type;
  if (object_id !== undefined) record.object_id = object_id;
  if (content) record.content = content;

  await admin.from("notifications").insert(record);
}
