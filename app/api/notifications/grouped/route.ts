import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_SOCIAL_TYPES, NOTIFICATION_SYSTEM_TYPES } from "@/lib/constants";
import { getTranslations } from "next-intl/server";
import { safePage } from "@/lib/utils";

const PAGE_SIZE = 10;
const GROUPABLE_TYPES = ["like", "follow"];
const POST_OBJECT_TYPES = ["first_post", "comeback_post"];

interface GroupedNotificationRow {
  key: string;
  type: string;
  is_grouped: boolean;
  notification_ids: number[];
  actor_ids: string[];
  actor_count: number;
  object_id?: number;
  object_type?: string;
  content?: string;
  is_read: boolean;
  latest_at: string;
}

interface RawNotificationRow {
  id: number;
  type: string;
  content?: string | null;
  object_id?: number | null;
  object_type?: string | null;
  is_read: boolean;
  created_at: string;
  actor_id?: string | null;
}

function buildNotificationGroupKey(notification: RawNotificationRow) {
  if (GROUPABLE_TYPES.includes(notification.type) && notification.object_id) {
    return `${notification.type}:${notification.object_type || ""}:${notification.object_id}`;
  }

  if (notification.type === "follow" && !notification.object_id) {
    return "follow:general";
  }

  return `single:${notification.id}`;
}

function normalizeGroupedRpcRows(rows: unknown[]): GroupedNotificationRow[] {
  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    const notificationIds = Array.isArray(item.notification_ids)
      ? item.notification_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : [];
    const actorIds = Array.isArray(item.actor_ids)
      ? item.actor_ids.map((id) => String(id)).filter(Boolean)
      : [];

    return {
      key: String(item.key || ""),
      type: String(item.type || ""),
      is_grouped: Boolean(item.is_grouped),
      notification_ids: notificationIds,
      actor_ids: actorIds,
      actor_count: Number(item.actor_count || actorIds.length || 0),
      object_id: item.object_id != null ? Number(item.object_id) : undefined,
      object_type: item.object_type ? String(item.object_type) : undefined,
      content: item.content ? String(item.content) : undefined,
      is_read: Boolean(item.is_read),
      latest_at: String(item.latest_at || ""),
    };
  });
}

async function fetchLegacyGroupedRows(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  typeFilter: string[],
  page: number,
) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rawNotifs } = await admin
    .from("notifications")
    .select("id, type, content, object_id, object_type, is_read, created_at, actor_id")
    .eq("user_id", userId)
    .in("type", typeFilter)
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!rawNotifs || rawNotifs.length === 0) {
    return { rows: [] as GroupedNotificationRow[], hasMore: false, unreadCount: 0 };
  }

  const actorIds = [...new Set(rawNotifs.filter((n) => n.actor_id).map((n) => n.actor_id!))];
  let blockedActors = new Set<string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, status")
      .in("user_id", actorIds);
    if (profiles) {
      blockedActors = new Set(
        profiles.filter((p) => p.status && p.status !== "active").map((p) => p.user_id),
      );
    }
  }

  const { data: blockedByMe } = await admin
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  const blockedByMeSet = new Set((blockedByMe || []).map((b) => b.blocked_id));

  const filtered = rawNotifs.filter(
    (n) => !n.actor_id || (!blockedActors.has(n.actor_id) && !blockedByMeSet.has(n.actor_id)),
  );

  interface LegacyGroupedItem {
    key: string;
    type: string;
    is_grouped: boolean;
    notification_ids: number[];
    actor_ids: string[];
    object_id?: number;
    object_type?: string;
    content?: string;
    is_read: boolean;
    latest_at: string;
  }

  const groupMap = new Map<string, LegacyGroupedItem>();
  const singles: LegacyGroupedItem[] = [];

  for (const n of filtered) {
    const key = buildNotificationGroupKey(n);

    if (key.startsWith("single:")) {
      singles.push({
        key,
        type: n.type,
        is_grouped: false,
        notification_ids: [n.id],
        actor_ids: n.actor_id ? [n.actor_id] : [],
        object_id: n.object_id || undefined,
        object_type: n.object_type || undefined,
        content: n.content || undefined,
        is_read: n.is_read,
        latest_at: n.created_at,
      });
      continue;
    }

    const existing = groupMap.get(key);
    if (existing) {
      existing.notification_ids.push(n.id);
      if (n.actor_id && !existing.actor_ids.includes(n.actor_id)) {
        existing.actor_ids.push(n.actor_id);
      }
      if (!n.is_read) existing.is_read = false;
      if (n.created_at > existing.latest_at) existing.latest_at = n.created_at;
      continue;
    }

    groupMap.set(key, {
      key,
      type: n.type,
      is_grouped: true,
      notification_ids: [n.id],
      actor_ids: n.actor_id ? [n.actor_id] : [],
      object_id: n.object_id || undefined,
      object_type: n.object_type || undefined,
      content: n.content || undefined,
      is_read: n.is_read,
      latest_at: n.created_at,
    });
  }

  const allItems = [...groupMap.values(), ...singles].sort(
    (a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime(),
  );

  const start = (page - 1) * PAGE_SIZE;
  const pageItems = allItems.slice(start, start + PAGE_SIZE);

  return {
    rows: pageItems.map((item) => ({
      ...item,
      actor_count: item.actor_ids.length,
    })),
    hasMore: allItems.length > start + PAGE_SIZE,
    unreadCount: filtered.filter((n) => !n.is_read).length,
  };
}

async function hydrateGroupedRows(
  admin: ReturnType<typeof createAdminClient>,
  rows: GroupedNotificationRow[],
) {
  if (rows.length === 0) {
    return [];
  }

  const neededActorIds = new Set<string>();
  for (const item of rows) {
    for (const actorId of item.actor_ids.slice(0, 3)) {
      neededActorIds.add(actorId);
    }
  }

  let actorMap = new Map<string, { username: string; avatar_url?: string; full_name?: string }>();
  if (neededActorIds.size > 0) {
    const { data: actors } = await admin
      .from("profiles")
      .select("user_id, username, avatar_url, full_name")
      .in("user_id", [...neededActorIds]);
    if (actors) {
      actorMap = new Map(actors.map((actor) => [actor.user_id, actor]));
    }
  }

  const postIds = new Set<number>();
  const commentIds = new Set<number>();
  for (const item of rows) {
    if (item.object_id && (item.object_type === "post" || POST_OBJECT_TYPES.includes(item.type))) {
      postIds.add(item.object_id);
    }
    if (item.object_type === "comment" && item.object_id) {
      commentIds.add(item.object_id);
    }
  }

  let postMap = new Map<number, { slug: string; featured_image?: string; video_thumbnail?: string }>();
  if (postIds.size > 0) {
    const { data: posts } = await admin
      .from("posts")
      .select("id, slug, featured_image, video_thumbnail")
      .in("id", [...postIds]);
    if (posts) {
      postMap = new Map(posts.map((post) => [post.id, post]));
    }
  }

  let commentPostMap = new Map<number, string>();
  if (commentIds.size > 0) {
    const { data: comments } = await admin
      .from("comments")
      .select("id, post_id")
      .in("id", [...commentIds]);

    if (comments) {
      const commentPostIds = [...new Set(comments.map((comment) => comment.post_id))];
      if (commentPostIds.length > 0) {
        const { data: commentPosts } = await admin
          .from("posts")
          .select("id, slug")
          .in("id", commentPostIds);
        const slugMap = new Map((commentPosts || []).map((post) => [post.id, post.slug]));
        for (const comment of comments) {
          const slug = slugMap.get(comment.post_id);
          if (slug) commentPostMap.set(comment.id, slug);
        }
      }
    }
  }

  return rows.map((item) => {
    const actors = item.actor_ids.slice(0, 3).map((actorId) => actorMap.get(actorId)).filter(Boolean);
    const postData =
      item.object_id && (item.object_type === "post" || POST_OBJECT_TYPES.includes(item.type))
        ? postMap.get(item.object_id)
        : null;

    return {
      id: item.key,
      type: item.type,
      is_grouped: item.is_grouped,
      actors,
      actor_count: item.actor_count,
      actor: !item.is_grouped && item.actor_ids[0] ? actorMap.get(item.actor_ids[0]) || null : undefined,
      object_id: item.object_id,
      object_type: item.object_type,
      post_slug: postData?.slug || null,
      post_thumbnail: postData?.featured_image || postData?.video_thumbnail || null,
      comment_post_slug:
        item.object_type === "comment" && item.object_id
          ? commentPostMap.get(item.object_id) || null
          : null,
      content: item.content,
      is_read: item.is_read,
      latest_at: item.latest_at,
      notification_ids: item.notification_ids,
    };
  });
}

async function markRowsAsRead(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  rows: GroupedNotificationRow[],
) {
  const unreadIds = rows.flatMap((row) => row.is_read ? [] : row.notification_ids);
  if (unreadIds.length === 0) return;

  admin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .in("id", unreadIds)
    .then(() => {});
}

export async function GET(req: NextRequest) {
  try {
    const tErrors = await getTranslations("apiErrors");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: tErrors("unauthorized") }, { status: 401 });

    const tab = req.nextUrl.searchParams.get("tab") || "social";
    const page = safePage(req.nextUrl.searchParams.get("page"));
    const admin = createAdminClient();
    const typeFilter =
      tab === "system"
        ? (NOTIFICATION_SYSTEM_TYPES as unknown as string[])
        : (NOTIFICATION_SOCIAL_TYPES as unknown as string[]);

    let groupedRows: GroupedNotificationRow[] = [];
    let hasMore = false;
    let unreadCount = 0;

    const { data: groupedRpcRows, error: groupedRpcError } = await admin.rpc(
      "get_grouped_notifications_page",
      {
        p_user_id: user.id,
        p_types: typeFilter,
        p_page: page,
        p_page_size: PAGE_SIZE,
      },
    );

    if (!groupedRpcError && Array.isArray(groupedRpcRows)) {
      const normalized = normalizeGroupedRpcRows(groupedRpcRows);
      hasMore = normalized.length > PAGE_SIZE;
      groupedRows = normalized.slice(0, PAGE_SIZE);
      unreadCount = groupedRows.filter((row) => !row.is_read).length;
    } else {
      const legacy = await fetchLegacyGroupedRows(admin, user.id, typeFilter, page);
      groupedRows = legacy.rows;
      hasMore = legacy.hasMore;
      unreadCount = legacy.unreadCount;
    }

    if (groupedRows.length === 0) {
      return NextResponse.json({ notifications: [], hasMore: false, unread_count: 0 });
    }

    const notifications = await hydrateGroupedRows(admin, groupedRows);
    await markRowsAsRead(admin, user.id, groupedRows);

    return NextResponse.json({ notifications, hasMore, unread_count: unreadCount });
  } catch {
    const tCatch = await getTranslations("apiErrors");
    return NextResponse.json({ error: tCatch("serverError") }, { status: 500 });
  }
}
