import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null
let staleAuthCleanupPromise: Promise<void> | null = null

function isInvalidRefreshTokenMessage(message: string | undefined) {
  if (!message) return false
  const normalized = message.toLowerCase()
  return (
    normalized.includes('invalid refresh token') ||
    normalized.includes('refresh token not found') ||
    normalized.includes('jwt expired')
  )
}

function clearSupabaseBrowserStorage() {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) keysToRemove.push(key)
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {}

  try {
    document.cookie
      .split(';')
      .map((entry) => entry.trim().split('=')[0])
      .filter((name) => name.startsWith('sb-'))
      .forEach((name) => {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
        document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${window.location.hostname}; SameSite=Lax`
      })
  } catch {}
}

async function clearStaleAuth(client: ReturnType<typeof createBrowserClient>) {
  if (!staleAuthCleanupPromise) {
    staleAuthCleanupPromise = (async () => {
      try {
        await client.auth.signOut({ scope: 'local' })
      } catch {}
      clearSupabaseBrowserStorage()
    })().finally(() => {
      staleAuthCleanupPromise = null
    })
  }

  await staleAuthCleanupPromise
}

function patchAuthMethods(client: ReturnType<typeof createBrowserClient>) {
  const wrapMethod = <TArgs extends unknown[], TResult>(
    key: 'getUser' | 'getSession' | 'refreshSession',
    fallback: TResult,
  ) => {
    const original = client.auth[key].bind(client.auth) as (...args: TArgs) => Promise<TResult>

    ;(client.auth as any)[key] = async (...args: TArgs): Promise<TResult> => {
      try {
        const result = await original(...args)
        const maybeError = (result as any)?.error
        if (isInvalidRefreshTokenMessage(maybeError?.message)) {
          await clearStaleAuth(client)
          return fallback
        }
        return result
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? '')
        if (isInvalidRefreshTokenMessage(message)) {
          await clearStaleAuth(client)
          return fallback
        }
        throw error
      }
    }
  }

  wrapMethod('getUser', { data: { user: null }, error: null } as any)
  wrapMethod('getSession', { data: { session: null }, error: null } as any)
  wrapMethod('refreshSession', { data: { session: null, user: null }, error: null } as any)
}

export function createClient() {
  if (browserClient) return browserClient

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!supabasePublishableKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable');
  }

  browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    cookieOptions: {
      secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
    },
  })

  patchAuthMethods(browserClient)

  return browserClient
}
