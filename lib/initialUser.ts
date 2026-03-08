import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUserId } from "@/lib/auth";
import type { InitialUser } from "@/components/UserContext";

const INITIAL_USER_SELECT = [
  "username",
  "full_name",
  "name",
  "surname",
  "avatar_url",
  "account_type",
  "is_premium",
  "premium_plan",
  "is_verified",
  "role",
  "status",
  "copyright_eligible",
  "language",
  "account_private",
  "onboarding_completed",
  "email_verified",
].join(", ");

interface InitialUserProfileRow {
  username?: string | null;
  full_name?: string | null;
  name?: string | null;
  surname?: string | null;
  avatar_url?: string | null;
  account_type?: string | null;
  is_premium?: boolean | null;
  premium_plan?: string | null;
  is_verified?: boolean | null;
  role?: string | null;
  status?: string | null;
  copyright_eligible?: boolean | null;
  language?: string | null;
  account_private?: boolean | null;
  onboarding_completed?: boolean | null;
  email_verified?: boolean | null;
}

function mapInitialUser(userId: string, profile: InitialUserProfileRow): InitialUser {
  return {
    id: userId,
    username: profile.username || "",
    fullName: profile.full_name || [profile.name, profile.surname].filter(Boolean).join(" ") || "",
    avatarUrl: profile.avatar_url || null,
    accountType: profile.account_type || "personal",
    isPremium: profile.is_premium === true,
    premiumPlan: profile.is_premium ? (profile.premium_plan || null) : null,
    isVerified: profile.is_verified === true,
    role: profile.role || "user",
    status: profile.status || "active",
    copyrightEligible: profile.copyright_eligible === true,
    accountPrivate: profile.account_private === true,
    locale: profile.language || "tr",
    emailVerified: profile.email_verified === true,
  };
}

export async function getInitialUserProfileRow(userId: string): Promise<InitialUserProfileRow | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(INITIAL_USER_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  return (profile as InitialUserProfileRow | null) || null;
}

export async function getInitialUserForShell(): Promise<InitialUser | null> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return null;
    const profile = await getInitialUserProfileRow(userId);
    if (!profile) return null;
    return mapInitialUser(userId, profile);
  } catch {
    return null;
  }
}

export async function getInitialUserForDashboard(): Promise<{ user: InitialUser | null; needsOnboarding: boolean }> {
  try {
    const userId = await getAuthUserId();
    if (!userId) return { user: null, needsOnboarding: false };
    const profile = await getInitialUserProfileRow(userId);
    if (!profile || !profile.onboarding_completed) {
      return { user: null, needsOnboarding: true };
    }
    return {
      user: mapInitialUser(userId, profile),
      needsOnboarding: false,
    };
  } catch {
    return { user: null, needsOnboarding: false };
  }
}
