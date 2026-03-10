import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

type PostIdRow = {
  post_id: number | null;
};

export type ViewerPostInteractionFields = {
  viewer_liked: boolean;
  viewer_saved: boolean;
};

export async function attachViewerPostInteractions<T extends { id: number }>(
  posts: T[],
  userId?: string | null,
  adminClient?: AdminClient,
): Promise<Array<T & ViewerPostInteractionFields>> {
  if (posts.length === 0) {
    return posts as Array<T & ViewerPostInteractionFields>;
  }

  const uniqueIds = [...new Set(
    posts
      .map((post) => Number(post.id))
      .filter((id) => Number.isInteger(id) && id > 0),
  )];

  if (!userId || uniqueIds.length === 0) {
    return posts.map((post) => ({
      ...post,
      viewer_liked: false,
      viewer_saved: false,
    }));
  }

  const admin = adminClient ?? createAdminClient();
  const [{ data: likes }, { data: bookmarks }] = await Promise.all([
    admin.from("likes").select("post_id").eq("user_id", userId).in("post_id", uniqueIds),
    admin.from("bookmarks").select("post_id").eq("user_id", userId).in("post_id", uniqueIds),
  ]);

  const likedIds = new Set(
    ((likes || []) as PostIdRow[])
      .map((row) => row.post_id)
      .filter((id): id is number => typeof id === "number"),
  );
  const savedIds = new Set(
    ((bookmarks || []) as PostIdRow[])
      .map((row) => row.post_id)
      .filter((id): id is number => typeof id === "number"),
  );

  return posts.map((post) => ({
    ...post,
    viewer_liked: likedIds.has(post.id),
    viewer_saved: savedIds.has(post.id),
  }));
}
