import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

/**
 * Get authenticated user ID from request header set by proxy.
 * Falls back to direct Supabase auth check when proxy doesn't run
 * (e.g. dynamic routes like /[slug]/moderation not in proxy matcher).
 */
export async function getAuthUserId(): Promise<string | null> {
  const [h, cookieStore] = await Promise.all([headers(), cookies()]);
  const fromHeader = h.get('x-user-id');
  const authVerified = h.get('x-auth-verified');
  if (authVerified === '1' && fromHeader) return fromHeader;
  if (authVerified === '0') return null;

  const hasAuthCookies = cookieStore.getAll().some((cookie) => cookie.name.startsWith('sb-'));
  if (!hasAuthCookies) return null;

  // Fallback: direct auth check from cookies
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}
