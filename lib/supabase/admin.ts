import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton admin client — reuses connection within the process lifecycle.
// In serverless environments (Vercel), each cold start gets a fresh instance.
// Within a warm instance, all requests share the same client (no per-request overhead).
let adminClient: SupabaseClient | null = null

export function createAdminClient() {
  if (!adminClient) {
    adminClient = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
      (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'public' },
        global: {
          headers: { 'x-feedim-client': 'admin' },
        },
      }
    )
  }
  return adminClient
}
