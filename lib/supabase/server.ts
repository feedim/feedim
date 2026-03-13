import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const authorization = headerStore.get('authorization')
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component
          }
        },
      },
      // Mobile clients send Bearer token — set it as global Authorization
      // so PostgREST requests use the user's JWT for RLS (auth.uid()).
      ...(bearerToken && {
        global: {
          headers: { Authorization: `Bearer ${bearerToken}` },
        },
      }),
    }
  )

  // Mobile clients: also patch getUser to verify the bearer token directly.
  if (bearerToken) {
    const _getUser = supabase.auth.getUser.bind(supabase.auth)
    supabase.auth.getUser = async (jwt?: string) => _getUser(jwt || bearerToken)
  }

  return supabase
}
