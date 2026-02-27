import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTIFICATION_SOCIAL_TYPES, NOTIFICATION_SYSTEM_TYPES } from "@/lib/constants";

const PAGE_SIZE = 10;
const GROUPABLE_TYPES = ["like", "follow"];

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tab = req.nextUrl.searchParams.get("tab") || "social";
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);

    const admin = createAdminClient();
    const typeFilter = tab === "system"
      ? NOTIFICATION_SYSTEM_TYPES as unknown as string[]
      : NOTIFICATION_SOCIAL_TYPES as unknown as string[];

    // Fetch raw notifications from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rawNotifs } = await admin
      .from("notifications")
      .select("id, type, content, object_id, object_type, is_read, created_at, actor_id")
      .eq("user_id", user.id)
      .in("type", typeFilter)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!rawNotifs || rawNotifs.length === 0) {
      return NextResponse.json({ notifications: [], hasMore: false, unread_count: 0 });
    }

    // Filter out blocked/inactive actors
    const actorIds = [...new Set(rawNotifs.filter(n => n.actor_id).map(n => n.actor_id!))];
    let blockedActors = new Set<string>();
    if (actorIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("user_id, status")
        .in("user_id", actorIds);
      if (profiles) {
        blockedActors = new Set(
          profiles.filter(p => p.status && p.status !== "active").map(p => p.user_id)
        );
      }
    }

    // Filter out users blocked by current user
    const { data: blockedByMe } = await admin
      .from("blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    const blockedByMeSet = new Set((blockedByMe || []).map(b => b.blocked_id));

    const filtered = rawNotifs.filter(n => !n.actor_id || (!blockedActors.has(n.actor_id) && !blockedByMeSet.has(n.actor_id)));

    // Group notifications
    interface GroupedItem {
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

    const groupMap = new Map<string, GroupedItem>();
    const singles: GroupedItem[] = [];

    for (const n of filtered) {
      if (GROUPABLE_TYPES.includes(n.type) && n.object_id) {
        const key = `${n.type}:${n.object_type || ""}:${n.object_id}`;
        const existing = groupMap.get(key);
        if (existing) {
          existing.notification_ids.push(n.id);
          if (n.actor_id && !existing.actor_ids.includes(n.actor_id)) {
            existing.actor_ids.push(n.actor_id);
          }
          if (!n.is_read) existing.is_read = false;
          if (n.created_at > existing.latest_at) existing.latest_at = n.created_at;
        } else {
          groupMap.set(key, {
            key,
            type: n.type,
            is_grouped: true,
            notification_ids: [n.id],
            actor_ids: n.actor_id ? [n.actor_id] : [],
            object_id: n.object_id,
            object_type: n.object_type || undefined,
            content: n.content || undefined,
            is_read: n.is_read,
            latest_at: n.created_at,
          });
        }
      } else if (n.type === "follow" && !n.object_id) {
        // Group follows without object_id together
        const key = "follow:general";
        const existing = groupMap.get(key);
        if (existing) {
          existing.notification_ids.push(n.id);
          if (n.actor_id && !existing.actor_ids.includes(n.actor_id)) {
            existing.actor_ids.push(n.actor_id);
          }
          if (!n.is_read) existing.is_read = false;
          if (n.created_at > existing.latest_at) existing.latest_at = n.created_at;
        } else {
          groupMap.set(key, {
            key,
            type: "follow",
            is_grouped: true,
            notification_ids: [n.id],
            actor_ids: n.actor_id ? [n.actor_id] : [],
            object_type: undefined,
            content: n.content || undefined,
            is_read: n.is_read,
            latest_at: n.created_at,
          });
        }
      } else {
        singles.push({
          key: `single:${n.id}`,
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
      }
    }

    // Merge groups and singles, sort by latest_at
    const allItems = [...groupMap.values(), ...singles]
      .sort((a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime());

    // Paginate
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = allItems.slice(start, start + PAGE_SIZE);
    const hasMore = allItems.length > start + PAGE_SIZE;

    // Collect all needed actor IDs (first 3 per group)
    const neededActorIds = new Set<string>();
    for (const item of pageItems) {
      for (const aid of item.actor_ids.slice(0, 3)) {
        neededActorIds.add(aid);
      }
    }

    // Fetch actor profiles
    let actorMap = new Map<string, { username: string; avatar_url?: string; full_name?: string }>();
    if (neededActorIds.size > 0) {
      const { data: actors } = await admin
        .from("profiles")
        .select("user_id, username, avatar_url, full_name")
        .in("user_id", [...neededActorIds]);
      if (actors) {
        actorMap = new Map(actors.map(a => [a.user_id, a]));
      }
    }

    // Collect post IDs for thumbnails (like groups + post-related singles)
    const postIds = new Set<number>();
    for (const item of pageItems) {
      if (item.object_type === "post" && item.object_id) {
        postIds.add(item.object_id);
      }
    }

    // Also collect comment IDs to resolve post slugs
    const commentIds = new Set<number>();
    for (const item of pageItems) {
      if (item.object_type === "comment" && item.object_id) {
        commentIds.add(item.object_id);
      }
    }

    // Fetch post data
    let postMap = new Map<number, { slug: string; featured_image?: string; video_thumbnail?: string }>();
    if (postIds.size > 0) {
      const { data: posts } = await admin
        .from("posts")
        .select("id, slug, featured_image, video_thumbnail")
        .in("id", [...postIds]);
      if (posts) {
        postMap = new Map(posts.map(p => [p.id, p]));
      }
    }

    // Fetch comment → post slug mapping
    let commentPostMap = new Map<number, string>();
    if (commentIds.size > 0) {
      const { data: comments } = await admin
        .from("comments")
        .select("id, post_id")
        .in("id", [...commentIds]);
      if (comments) {
        const cPostIds = [...new Set(comments.map(c => c.post_id))];
        if (cPostIds.length > 0) {
          const { data: cPosts } = await admin
            .from("posts")
            .select("id, slug")
            .in("id", cPostIds);
          const slugMap = new Map((cPosts || []).map(p => [p.id, p.slug]));
          for (const c of comments) {
            const slug = slugMap.get(c.post_id);
            if (slug) commentPostMap.set(c.id, slug);
          }
        }
      }
    }

    // Build response
    const notifications = pageItems.map(item => {
      const actors = item.actor_ids.slice(0, 3).map(aid => actorMap.get(aid)).filter(Boolean);
      const postData = item.object_type === "post" && item.object_id ? postMap.get(item.object_id) : null;

      return {
        id: item.key,
        type: item.type,
        is_grouped: item.is_grouped,
        actors,
        actor_count: item.actor_ids.length,
        actor: !item.is_grouped && item.actor_ids[0] ? actorMap.get(item.actor_ids[0]) || null : undefined,
        object_id: item.object_id,
        object_type: item.object_type,
        post_slug: postData?.slug || null,
        post_thumbnail: postData?.featured_image || postData?.video_thumbnail || null,
        comment_post_slug: item.object_type === "comment" && item.object_id ? commentPostMap.get(item.object_id) || null : null,
        content: item.content,
        is_read: item.is_read,
        latest_at: item.latest_at,
        notification_ids: item.notification_ids,
      };
    });

    // Count total unread
    const unread_count = filtered.filter(n => !n.is_read).length;

    // Mark page notifications as read
    const unreadIds = pageItems.flatMap(item => item.notification_ids).filter(id => {
      const n = filtered.find(x => x.id === id);
      return n && !n.is_read;
    });
    if (unreadIds.length > 0) {
      admin.from("notifications").update({ is_read: true }).in("id", unreadIds).then(() => {});
    }

    return NextResponse.json({ notifications, hasMore, unread_count });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
