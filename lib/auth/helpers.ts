/**
 * Authentication Helper Functions
 * Shared utilities for authentication and authorization
 */

import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { type SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if user is authenticated and redirect if not
 * @param supabase - Supabase client instance
 * @param router - Next.js router instance
 * @returns User object if authenticated, null otherwise
 */
export async function requireAuth(
  supabase: SupabaseClient,
  router: { push: (path: string) => void }
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    router.push("/login");
    return null;
  }

  return user;
}

/**
 * Get current authenticated user without redirect
 * @param supabase - Supabase client instance
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Check if user is authenticated
 * @param supabase - Supabase client instance
 * @returns true if authenticated, false otherwise
 */
export async function isAuthenticated(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}
