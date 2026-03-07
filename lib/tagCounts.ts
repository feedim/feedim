import type { SupabaseClient } from "@supabase/supabase-js";

function uniqTagIds(tagIds: number[]): number[] {
  return [...new Set(tagIds.filter((id) => Number.isFinite(id) && id > 0))];
}

export async function getPostTagIds(
  admin: SupabaseClient,
  postId: number
): Promise<number[]> {
  const { data } = await admin
    .from("post_tags")
    .select("tag_id")
    .eq("post_id", postId);

  return uniqTagIds((data || []).map((row: { tag_id: number }) => row.tag_id));
}

export async function adjustTagPostCounts(
  admin: SupabaseClient,
  tagIds: number[],
  delta: 1 | -1
): Promise<void> {
  const uniqueIds = uniqTagIds(tagIds);
  if (uniqueIds.length === 0) return;

  const { data: tags } = await admin
    .from("tags")
    .select("id, post_count")
    .in("id", uniqueIds);

  const countMap = new Map(
    (tags || []).map((tag: { id: number; post_count: number | null }) => [
      tag.id,
      tag.post_count || 0,
    ])
  );

  await Promise.all(
    uniqueIds.map((tagId) => {
      const current = countMap.get(tagId) || 0;
      const next = delta === 1 ? current + 1 : Math.max(0, current - 1);
      return admin.from("tags").update({ post_count: next }).eq("id", tagId);
    })
  );
}

export async function syncPublishedTagCounts(
  admin: SupabaseClient,
  options: {
    oldTagIds: number[];
    newTagIds: number[];
    wasPublished: boolean;
    willBePublished: boolean;
  }
): Promise<void> {
  const oldTagIds = uniqTagIds(options.oldTagIds);
  const newTagIds = uniqTagIds(options.newTagIds);

  if (!options.wasPublished && !options.willBePublished) return;

  if (!options.wasPublished && options.willBePublished) {
    await adjustTagPostCounts(admin, newTagIds, 1);
    return;
  }

  if (options.wasPublished && !options.willBePublished) {
    await adjustTagPostCounts(admin, oldTagIds, -1);
    return;
  }

  const removedTagIds = oldTagIds.filter((id) => !newTagIds.includes(id));
  const addedTagIds = newTagIds.filter((id) => !oldTagIds.includes(id));

  await Promise.all([
    adjustTagPostCounts(admin, removedTagIds, -1),
    adjustTagPostCounts(admin, addedTagIds, 1),
  ]);
}

export async function syncTagCountsForStatusChange(
  admin: SupabaseClient,
  postId: number,
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined
): Promise<void> {
  const wasPublished = fromStatus === "published";
  const willBePublished = toStatus === "published";
  if (wasPublished === willBePublished) return;

  const tagIds = await getPostTagIds(admin, postId);
  await syncPublishedTagCounts(admin, {
    oldTagIds: tagIds,
    newTagIds: tagIds,
    wasPublished,
    willBePublished,
  });
}
