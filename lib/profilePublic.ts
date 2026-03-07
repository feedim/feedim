export interface PublicProfileRow {
  user_id: string;
  name?: string | null;
  surname?: string | null;
  full_name?: string | null;
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  website?: string | null;
  links?: { title: string; url: string }[] | null;
  is_verified?: boolean | null;
  premium_plan?: string | null;
  is_premium?: boolean | null;
  role?: string | null;
  post_count?: number | null;
  follower_count?: number | null;
  following_count?: number | null;
  created_at?: string | null;
  account_private?: boolean | null;
  account_type?: string | null;
  professional_category?: string | null;
  status?: string | null;
}

// Public profile fields that are safe to expose to unauthenticated users.
// Keep this list strict to avoid leaking sensitive profile columns.
export const PUBLIC_PROFILE_FIELDS = [
  "user_id",
  "name",
  "surname",
  "full_name",
  "username",
  "avatar_url",
  "bio",
  "website",
  "links",
  "is_verified",
  "premium_plan",
  "is_premium",
  "role",
  "post_count",
  "follower_count",
  "following_count",
  "created_at",
  "account_private",
  "account_type",
  "professional_category",
  "status",
] as const;

export const PUBLIC_PROFILE_SELECT = PUBLIC_PROFILE_FIELDS.join(", ");
