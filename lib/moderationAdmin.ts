import { createAdminClient } from "@/lib/supabase/admin";

export interface ModeratorAccess {
  role: string;
  moderationCountry: string | null;
  moderationAssignment: string | null;
}

export async function getModeratorAccess(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<ModeratorAccess | null> {
  let profile: {
    role?: string | null;
    moderation_country?: string | null;
    moderation_assignment?: string | null;
  } | null = null;

  const { data: withAssignment, error } = await admin
    .from("profiles")
    .select("role, moderation_country, moderation_assignment")
    .eq("user_id", userId)
    .single();

  if (error && (error.code === "PGRST204" || error.message?.includes("moderation_assignment"))) {
    const { data: fallback } = await admin
      .from("profiles")
      .select("role, moderation_country")
      .eq("user_id", userId)
      .single();
    profile = fallback;
  } else {
    profile = withAssignment;
  }

  if (!profile?.role || (profile.role !== "admin" && profile.role !== "moderator")) {
    return null;
  }

  return {
    role: profile.role,
    moderationCountry: profile.moderation_country ?? null,
    moderationAssignment: profile.moderation_assignment ?? null,
  };
}

export function canAccessModerationArea(
  moderator: ModeratorAccess,
  area: "review" | "applications" | "payments" | "management",
): boolean {
  if (moderator.role === "admin") return true;
  if (!moderator.moderationAssignment) return true;

  const allowedByAssignment: Record<string, Array<"review" | "applications" | "payments" | "management">> = {
    review: ["review"],
    applications: ["applications"],
    payments: ["payments"],
    management: ["review", "applications", "payments", "management"],
  };

  return allowedByAssignment[moderator.moderationAssignment]?.includes(area) ?? false;
}

export function getModeratorCountryFilter(moderator: ModeratorAccess): string | null {
  if (moderator.role === "admin") return null;
  return moderator.moderationCountry || null;
}
