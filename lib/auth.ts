import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Get authenticated user ID from request header set by middleware.
 * Falls back to direct Supabase auth check when middleware doesn't run
 * (e.g. dynamic routes like /[slug]/moderation not in middleware matcher).
 */
export async function getAuthUserId(): Promise<string | null> {
  const h = await headers();
  const fromHeader = h.get('x-user-id');
  if (fromHeader) return fromHeader;

  // Fallback: direct auth check from cookies
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}
