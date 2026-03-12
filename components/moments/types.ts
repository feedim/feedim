export interface Moment {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  video_url?: string;
  hls_url?: string;
  video_thumbnail?: string;
  featured_image?: string;
  video_duration?: number;
  like_count?: number;
  comment_count?: number;
  view_count?: number;
  save_count?: number;
  share_count?: number;
  profiles?: {
    user_id: string;
    username: string;
    full_name?: string;
    name?: string;
    surname?: string;
    avatar_url?: string;
    is_verified?: boolean;
    premium_plan?: string | null;
    role?: string;
  };
  post_tags?: { tags: { id: number; name: string; slug: string } }[];
  published_at?: string;
  sounds?: {
    id: number;
    title: string;
    artist?: string | null;
    audio_url: string;
    duration?: number | null;
    status: string;
    cover_image_url?: string | null;
    is_original?: boolean;
  } | null;
  visibility?: string;
  viewer_liked?: boolean;
  viewer_saved?: boolean;
}

export type DisplayItem =
  | { type: "moment"; moment: Moment; realIndex: number }
  | { type: "ad"; adKey: number; dismissed?: boolean };

export interface MomentsPerfHints {
  constrained: boolean;
  warmupDelayMs: number;
  allowVideoPrefetch: boolean;
}

export interface InteractionStatus {
  liked?: boolean;
  saved?: boolean;
}

export interface InteractionResponse {
  interactions?: Record<string, InteractionStatus>;
}

export type FeedMode = "for-you" | "following";
