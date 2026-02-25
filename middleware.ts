import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkUrl, isExemptPath } from '@/lib/waf'

const SUPPORTED_LOCALES = ['tr', 'az', 'en']
const DEFAULT_LOCALE = 'tr'

function parseAcceptLanguage(header: string | null): string {
  if (!header) return DEFAULT_LOCALE
  const langs = header.split(',').map(part => {
    const [lang, q] = part.trim().split(';q=')
    return { lang: lang.trim().split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 }
  }).sort((a, b) => b.q - a.q)
  for (const { lang } of langs) {
    if (SUPPORTED_LOCALES.includes(lang)) return lang
  }
  return 'en' // Foreign visitors default to English
}

// ─── IP Rate Limiter ───
const apiRateMap = new Map<string, { count: number; resetAt: number }>()
const API_RATE_LIMIT = 300
const API_RATE_WINDOW = 60_000

function checkApiRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = apiRateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    apiRateMap.set(ip, { count: 1, resetAt: now + API_RATE_WINDOW })
    return true
  }
  if (entry.count >= API_RATE_LIMIT) return false
  entry.count++
  return true
}

let lastCleanup = Date.now()
function cleanupRateMap() {
  const now = Date.now()
  if (now - lastCleanup < 300_000) return
  lastCleanup = now
  for (const [key, entry] of apiRateMap) {
    if (now > entry.resetAt) apiRateMap.delete(key)
  }
}

// Public paths that support locale prefix (/en/..., /az/...)
const PUBLIC_LOCALE_PATHS = ['/help', '/landing', '/u/', '/embed/', '/leaving']
// Matches /{slug} patterns for posts — single segment, not a known app route
const KNOWN_APP_PREFIXES = [
  '/api', '/explore', '/moments', '/video', '/note', '/notes', '/posts',
  '/notifications', '/bookmarks', '/analytics', '/coins', '/settings',
  '/profile', '/security', '/sounds', '/moderation', '/admin', '/app-payment',
  '/subscription-payment', '/transactions', '/withdrawal', '/suggestions',
  '/create', '/login', '/register', '/onboarding', '/account-moderation',
  '/premium', '/payment', '/auth', '/help', '/landing', '/u', '/embed', '/leaving',
]

function isPublicLocalePath(pathname: string): boolean {
  // Explicit public paths
  for (const p of PUBLIC_LOCALE_PATHS) {
    if (pathname === p || pathname.startsWith(p)) return true
  }
  // Single-segment paths like /{slug} (post slugs) — not a known app route
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 1) {
    const first = '/' + segments[0]
    if (!KNOWN_APP_PREFIXES.some(p => first === p || first.startsWith(p + '/'))) {
      return true
    }
  }
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── 0. Locale prefix handling for public pages ───
  // /en/help/terms → strip prefix, set locale, rewrite to /help/terms
  // /az/help/terms → strip prefix, set locale, rewrite to /help/terms
  // /tr/help/terms → 301 redirect to /help/terms (TR is default, no prefix)
  const localeMatch = pathname.match(/^\/(en|az|tr)(\/.*)?$/)
  if (localeMatch) {
    const urlLocale = localeMatch[1]
    const restPath = localeMatch[2] || '/'

    // Only handle locale prefixes for public pages
    if (isPublicLocalePath(restPath)) {
      // /tr/... → 301 redirect to unprefixed (TR is default)
      if (urlLocale === DEFAULT_LOCALE) {
        const url = request.nextUrl.clone()
        url.pathname = restPath
        return NextResponse.redirect(url, 301)
      }

      // /en/... or /az/... → rewrite to unprefixed, set locale
      const url = request.nextUrl.clone()
      url.pathname = restPath
      request.headers.set('x-locale', urlLocale)
      const response = NextResponse.rewrite(url, { request })
      response.cookies.set('fdm-locale', urlLocale, {
        maxAge: 86400 * 365, httpOnly: false, secure: true, sameSite: 'lax', path: '/',
      })
      return response
    }
  }

  // ─── 1. Create Supabase client with cookie-based session ───
  // This is the ONLY place where tokens get refreshed server-side.
  // The setAll callback updates both the request (for downstream handlers)
  // and the response (for the browser).
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update request cookies so downstream route handlers see fresh tokens
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          // Set cookies on response so browser receives fresh tokens
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ─── 2. WAF: Check URL for attacks ───
  if (pathname.startsWith('/api/') && !isExemptPath(pathname)) {
    const wafResult = checkUrl(pathname, request.nextUrl.searchParams)
    if (wafResult.blocked) {
      return NextResponse.json(
        { error: 'Request blocked' },
        { status: 403 }
      )
    }
  }

  // ─── 3. API Rate Limiting (before getUser to save a round-trip on blocked requests) ───
  if (pathname.startsWith('/api/')) {
    cleanupRateMap()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkApiRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
  }

  // ─── 3. Refresh session — CRITICAL ───
  // supabase.auth.getUser() validates the access token against the Supabase auth server.
  // If the token is expired, the SSR client automatically refreshes it using the
  // refresh token and calls setAll() with the new tokens.
  // This ensures ALL downstream handlers (API routes, server components) get valid tokens.
  //
  // Optimization: only call getUser() if auth cookies exist
  const hasAuthCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  let user: { id: string; [key: string]: any } | null = null

  if (hasAuthCookies) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  // Pass validated user ID to server components via request header.
  // This eliminates duplicate getUser() calls in server components.
  // Even if a client sends a fake x-user-id header, middleware overwrites it.
  if (user) {
    request.headers.set('x-user-id', user.id)
  }
  // Recreate response with modified request headers, preserve cookies
  const responseCookies = supabaseResponse.cookies.getAll()
  supabaseResponse = NextResponse.next({ request })
  responseCookies.forEach(c => supabaseResponse.cookies.set(c))

  // ─── 3b. Account status + onboarding + role — batched DB query ───
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isOnboarding = pathname === '/onboarding'
  const isAdminPath = pathname.startsWith('/moderation') || pathname.startsWith('/admin')
  const isAuthenticated = !!user

  if (user && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/account/freeze') && !pathname.startsWith('/api/account/delete')) {
    const statusCookie = request.cookies.get('fdm-status')?.value
    const onboardingCookie = request.cookies.get('fdm-onboarding')?.value
    const roleCookie = request.cookies.get('fdm-role')?.value

    const needStatus = !statusCookie || statusCookie !== 'active'
    const needOnboarding = onboardingCookie === undefined && !isOnboarding && !isAuthPage
    const needRole = !roleCookie && isAdminPath

    // Single batched DB query instead of up to 3 separate queries
    let status = statusCookie || ''
    let onboardingCompleted: boolean | null = null
    let role = roleCookie || ''

    if (needStatus || needOnboarding || needRole) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, onboarding_completed, role, language')
        .eq('user_id', user.id)
        .single()

      if (needStatus) status = profile?.status || 'active'
      if (needOnboarding) onboardingCompleted = profile?.onboarding_completed ?? null
      if (needRole) role = profile?.role || 'user'

      // ─── Locale: sync cookie from DB if missing ───
      const localeCookie = request.cookies.get('fdm-locale')?.value
      if (!localeCookie && profile?.language && SUPPORTED_LOCALES.includes(profile.language)) {
        supabaseResponse.cookies.set('fdm-locale', profile.language, {
          maxAge: 86400 * 365, httpOnly: false, secure: true, sameSite: 'lax', path: '/',
        })
      }
    }

    // --- Status enforcement ---
    if (needStatus && status === 'active') {
      // Cache active status for 1 minute to skip DB on subsequent requests
      supabaseResponse.cookies.set('fdm-status', 'active', {
        maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })
    }

    if (status !== 'active') {
      supabaseResponse.cookies.set('fdm-status', status, {
        maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })

      if (pathname.startsWith('/api/') && !pathname.startsWith('/api/account/')) {
        return NextResponse.json(
          { error: 'Hesabınız aktif değil', status },
          { status: 403 }
        )
      }

      // Helper: redirect that preserves refreshed auth cookies
      const redirect = (path: string) => {
        const response = NextResponse.redirect(new URL(path, request.url))
        supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
        return response
      }

      if (pathname !== '/account-moderation' && pathname !== '/auth/signout' && !pathname.startsWith('/api/') && !pathname.startsWith('/help')) {
        return redirect('/account-moderation')
      }
    }
    // If status is active but cookie was stale, clear it
    if (status === 'active' && statusCookie && statusCookie !== 'active') {
      supabaseResponse.cookies.set('fdm-status', '', { maxAge: 0, path: '/' })
    }

    // --- Onboarding enforcement (only for non-API, non-auth, non-onboarding) ---
    if (needOnboarding && onboardingCompleted !== null && !onboardingCompleted && !pathname.startsWith('/api/')) {
      const redirect = (path: string) => {
        const response = NextResponse.redirect(new URL(path, request.url))
        supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
        return response
      }
      return redirect('/onboarding')
    }
    if (needOnboarding && onboardingCompleted) {
      supabaseResponse.cookies.set('fdm-onboarding', '1', {
        maxAge: 86400 * 30, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })
    }

    // --- Admin role enforcement ---
    if (isAdminPath) {
      if (role !== 'admin' && role !== 'moderator') {
        const redirect = (path: string) => {
          const response = NextResponse.redirect(new URL(path, request.url))
          supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
          return response
        }
        return redirect('/')
      }
      supabaseResponse.cookies.set('fdm-role', role, {
        maxAge: 300, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })
    }
  }

  // ─── 3c. Locale resolution ───
  {
    const localeCookie = request.cookies.get('fdm-locale')?.value
    let resolvedLocale: string

    if (localeCookie && SUPPORTED_LOCALES.includes(localeCookie)) {
      resolvedLocale = localeCookie
    } else {
      // No cookie — detect from Accept-Language for unauthenticated users
      resolvedLocale = parseAcceptLanguage(request.headers.get('accept-language'))
      // Set cookie so next request doesn't need detection
      supabaseResponse.cookies.set('fdm-locale', resolvedLocale, {
        maxAge: 86400 * 365, httpOnly: false, secure: true, sameSite: 'lax', path: '/',
      })
    }

    // Set x-locale header for server components (next-intl reads this)
    request.headers.set('x-locale', resolvedLocale)
    // Recreate response to include the new header, preserve cookies
    const prevCookies = supabaseResponse.cookies.getAll()
    supabaseResponse = NextResponse.next({ request })
    prevCookies.forEach(c => supabaseResponse.cookies.set(c))
  }

  // For API routes, return with refreshed cookies (no further middleware logic needed)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // ─── 4. Route protection ───
  const publicAppPaths = ['/explore', '/moments', '/video', '/note', '/notes', '/posts', '/sounds']
  const isPublicApp = publicAppPaths.includes(pathname) || pathname.startsWith('/explore/') || pathname.startsWith('/video/') || pathname.startsWith('/note/') || pathname.startsWith('/moments/')
  const appPaths = ['/', '/explore', '/moments', '/video', '/note', '/notes', '/posts', '/notifications', '/bookmarks', '/analytics', '/coins', '/settings', '/profile', '/security', '/sounds', '/moderation', '/admin', '/app-payment', '/subscription-payment', '/transactions', '/withdrawal', '/suggestions', '/create']
  const isAppPath = appPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isProtected = isAppPath && !isPublicApp

  // Helper: redirect that preserves refreshed auth cookies
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
    return response
  }

  // Helper: rewrite that preserves refreshed auth cookies
  const rewrite = (path: string) => {
    const url = request.nextUrl.clone()
    url.pathname = path
    const response = NextResponse.rewrite(url)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
    return response
  }

  // Unauthenticated on home → show landing page
  if (!isAuthenticated && pathname === '/') {
    return rewrite('/landing')
  }

  // Authenticated on landing → go to home
  if (isAuthenticated && pathname === '/landing') {
    return redirect('/')
  }

  // Unauthenticated → login (protected routes)
  if (!isAuthenticated && isProtected) {
    return redirect('/login')
  }

  // Unauthenticated → login (onboarding)
  if (!isAuthenticated && isOnboarding) {
    return redirect('/login')
  }

  // Authenticated → home (auth pages)
  if (isAuthenticated && isAuthPage) {
    return redirect('/')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/api/:path*',
    // Locale-prefixed public paths
    '/en/:path*',
    '/az/:path*',
    '/tr/:path*',
    // App routes (was /dashboard/:path*)
    '/explore/:path*',
    '/moments',
    '/moments/:path*',
    '/video',
    '/video/:path*',
    '/note/:path*',
    '/notes/:path*',
    '/posts',
    '/notifications',
    '/bookmarks',
    '/analytics',
    '/coins/:path*',
    '/settings/:path*',
    '/profile',
    '/security',
    '/sounds/:path*',
    '/moderation',
    '/admin/:path*',
    '/app-payment',
    '/subscription-payment',
    '/transactions',
    '/withdrawal',
    '/suggestions',
    '/create/:path*',
    // Auth & other
    '/landing',
    '/login',
    '/register',
    '/onboarding',
    '/u/:path*',
    '/account-moderation',
    '/premium',
    '/payment/:path*',
    // Dynamic post sub-routes that need auth
    '/:slug/moderation',
  ],
}
