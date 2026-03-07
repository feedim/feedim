export interface Profile {
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
  coin_balance?: number | null;
  is_following?: boolean | null;
  follows_me?: boolean | null;
  is_own?: boolean | null;
  is_blocked?: boolean | null;
  is_blocked_by?: boolean | null;
  has_follow_request?: boolean | null;
  follow_request_count?: number | null;
  account_private?: boolean | null;
  account_type?: string | null;
  professional_category?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  mutual_followers?: { username: string; avatar_url: string | null; full_name: string | null }[];
  status?: string | null;
}

export type ProfileTabId = "all" | "posts" | "notes" | "moments" | "video" | "likes" | "comments";

export type ProfilePostItem = {
  id: number;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  video_thumbnail?: string;
  featured_image?: string;
  video_duration?: number;
  view_count?: number;
  is_nsfw?: boolean;
  [key: string]: unknown;
};

export type ProfileInteractions = Record<number, { liked: boolean; saved: boolean }>;
