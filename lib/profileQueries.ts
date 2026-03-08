import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_PROFILE_SELECT, type PublicProfileRow } from "@/lib/profilePublic";

interface UsernameRedirectRow {
  new_username: string;
}

export async function getPublicProfileByUsername(username: string): Promise<PublicProfileRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .eq("username", username)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PublicProfileRow;
}

export const getCachedPublicProfileByUsername = unstable_cache(
  getPublicProfileByUsername,
  ["public-profile-by-username"],
  { revalidate: 30, tags: ["profiles"] },
);

export async function getAnyProfileByUsername(username: string): Promise<PublicProfileRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select(PUBLIC_PROFILE_SELECT)
    .eq("username", username)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as PublicProfileRow;
}

export async function getLatestUsernameRedirect(username: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("username_redirects")
    .select("new_username")
    .eq("old_username", username)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const redirectRow = data as UsernameRedirectRow | null;
  if (error || !redirectRow?.new_username) return null;
  return redirectRow.new_username;
}

export const getCachedLatestUsernameRedirect = unstable_cache(
  getLatestUsernameRedirect,
  ["latest-username-redirect"],
  { revalidate: 300, tags: ["profiles"] },
);
