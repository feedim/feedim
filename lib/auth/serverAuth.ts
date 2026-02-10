import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Server-side authentication check
 * Throws redirect if not authenticated
 */
export async function requireAuth() {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return { user, supabase };
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return profile?.role === 'admin';
}

/**
 * Check if user is creator
 */
export async function isCreator(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single();

  return profile?.role === 'admin' || profile?.role === 'creator';
}

/**
 * Require admin access
 * Redirects if not admin
 */
export async function requireAdmin() {
  const { user, supabase } = await requireAuth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return { user, supabase, profile };
}

/**
 * Require creator access
 * Redirects if not creator or admin
 */
export async function requireCreator() {
  const { user, supabase } = await requireAuth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'creator') {
    redirect('/dashboard');
  }

  return { user, supabase, profile };
}
