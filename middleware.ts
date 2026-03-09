import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkUrl, isExemptPath } from '@/lib/waf'

const SUPPORTED_LOCALES = ['tr', 'az', 'en']
const DEFAULT_LOCALE = 'tr'

// ─── Helpers: Locale ───

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

// ─── Helpers: IP Rate Limiter (in-memory, edge-level) ───
// In-memory Map yeterli: bu geniş flood koruması (300/dk), güvenlik-kritik değil.
// Edge location başına persist eder. Kritik rate limiter'lar (OTP, CAPTCHA)
// Redis destekli: lib/otpRateLimit.ts, lib/captchaRateLimit.ts

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

// ─── Helpers: Route Classification ───

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

// ─── Helpers: Response factories ───

function redirectWithCookies(path: string, request: NextRequest, cookieSource: NextResponse): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url))
  cookieSource.cookies.getAll().forEach(c => response.cookies.set(c))
  return response
}

function rewriteWithCookies(path: string, request: NextRequest, cookieSource: NextResponse): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = path
  const response = NextResponse.rewrite(url)
  cookieSource.cookies.getAll().forEach(c => response.cookies.set(c))
  return response
}

// ─── Step: Redirect stray OAuth codes to /auth/callback ───

function handleOAuthRedirect(request: NextRequest): NextResponse | null {
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/callback'
    return NextResponse.redirect(url)
  }
  return null
}

// ─── Step: Locale prefix handling for public pages ───
// /en/help/terms → strip prefix, set locale, rewrite to /help/terms
// /az/help/terms → strip prefix, set locale, rewrite to /help/terms
// /tr/help/terms → 301 redirect to /help/terms (TR is default, no prefix)

function handleLocalePrefix(request: NextRequest, pathname: string): NextResponse | null {
  const localeMatch = pathname.match(/^\/(en|az|tr)(\/.*)?$/)
  if (!localeMatch) return null

  const urlLocale = localeMatch[1]
  const restPath = localeMatch[2] || '/'

  // Only handle locale prefixes for public pages
  if (!isPublicLocalePath(restPath)) return null

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

// ─── Step: WAF + API Rate Limiting ───

function checkApiSecurity(pathname: string, request: NextRequest): NextResponse | null {
  if (!pathname.startsWith('/api/')) return null

  // WAF: Check URL for attacks
  if (!isExemptPath(pathname)) {
    const wafResult = checkUrl(pathname, request.nextUrl.searchParams)
    if (wafResult.blocked) {
      return NextResponse.json({ error: 'request_blocked' }, { status: 403 })
    }
  }

  // Rate limiting (before getUser to save a round-trip on blocked requests)
  cleanupRateMap()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkApiRateLimit(ip)) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  return null
}

// ─── Step: Account status + onboarding + role checks (batched DB query) ───

async function handleAccountChecks(
  supabase: ReturnType<typeof createServerClient>,
  user: { id: string },
  pathname: string,
  request: NextRequest,
  response: NextResponse,
): Promise<{ response: NextResponse; earlyReturn?: NextResponse }> {
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isOnboarding = pathname === '/onboarding'
  const isAdminPath = pathname.startsWith('/moderation') || pathname.startsWith('/admin')

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
  let profile: { status?: string; onboarding_completed?: boolean; role?: string; language?: string; force_logout_before?: string } | null = null

  if (needStatus || needOnboarding || needRole) {
    const { data } = await supabase
      .from('profiles')
      .select('status, onboarding_completed, role, language, force_logout_before')
      .eq('user_id', user.id)
      .single()
    profile = data

    if (needStatus) status = profile?.status || 'active'
    if (needOnboarding) onboardingCompleted = profile?.onboarding_completed ?? null
    if (needRole) role = profile?.role || 'user'

    // Locale: sync cookie from DB if missing
    const localeCookie = request.cookies.get('fdm-locale')?.value
    if (!localeCookie && profile?.language && SUPPORTED_LOCALES.includes(profile.language)) {
      response.cookies.set('fdm-locale', profile.language, {
        maxAge: 86400 * 365, httpOnly: false, secure: true, sameSite: 'lax', path: '/',
      })
    }
  }

  // --- Force logout check (session termination from another device) ---
  if (profile?.force_logout_before) {
    const loginTsCookie = request.cookies.get('fdm-login-ts')?.value
    if (!loginTsCookie) {
      // First time with this feature — set cookie, skip check
      response.cookies.set('fdm-login-ts', Date.now().toString(), {
        maxAge: 86400 * 365, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })
    } else {
      const loginTs = parseInt(loginTsCookie, 10)
      const forceLogoutTs = new Date(profile.force_logout_before).getTime()

      if (loginTs < forceLogoutTs) {
        // This device's session was terminated — force sign out
        const signOutUrl = pathname.startsWith('/api/') ? undefined : new URL('/login', request.url)
        if (signOutUrl) {
          const signOutResponse = NextResponse.redirect(signOutUrl)
          // Clear all auth cookies
          request.cookies.getAll().forEach(c => {
            if (c.name.startsWith('sb-')) {
              signOutResponse.cookies.set(c.name, '', { maxAge: 0, path: '/' })
            }
          })
          signOutResponse.cookies.set('fdm-login-ts', '', { maxAge: 0, path: '/' })
          signOutResponse.cookies.set('fdm-status', '', { maxAge: 0, path: '/' })
          signOutResponse.cookies.set('fdm-onboarding', '', { maxAge: 0, path: '/' })
          return { response, earlyReturn: signOutResponse }
        } else {
          return {
            response,
            earlyReturn: NextResponse.json({ error: 'session_terminated' }, { status: 401 }),
          }
        }
      }
    }
  }

  // --- Status enforcement ---
  if (needStatus && status === 'active') {
    // Cache active status for 1 minute to skip DB on subsequent requests
    response.cookies.set('fdm-status', 'active', {
      maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    })
  }

  if (status !== 'active') {
    response.cookies.set('fdm-status', status, {
      maxAge: 10, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    })

    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/account/')) {
      return {
        response,
        earlyReturn: NextResponse.json(
          { error: 'account_not_active', status },
          { status: 403 }
        ),
      }
    }

    if (pathname !== '/account-moderation' && pathname !== '/auth/signout' && !pathname.startsWith('/api/') && !pathname.startsWith('/help')) {
      return { response, earlyReturn: redirectWithCookies('/account-moderation', request, response) }
    }
  }

  // If status is active but cookie was stale, clear it
  if (status === 'active' && statusCookie && statusCookie !== 'active') {
    response.cookies.set('fdm-status', '', { maxAge: 0, path: '/' })
  }

  // --- Onboarding enforcement (only for non-API, non-auth, non-onboarding) ---
  // !onboardingCompleted catches both null (new users) and false (incomplete)
  if (status === 'active' && needOnboarding && !onboardingCompleted && !pathname.startsWith('/api/')) {
    return { response, earlyReturn: redirectWithCookies('/onboarding', request, response) }
  }
  if (needOnboarding && onboardingCompleted) {
    response.cookies.set('fdm-onboarding', '1', {
      maxAge: 86400 * 30, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    })
  }

  // --- Admin role enforcement ---
  if (isAdminPath) {
    if (role !== 'admin' && role !== 'moderator') {
      return { response, earlyReturn: redirectWithCookies('/', request, response) }
    }
    response.cookies.set('fdm-role', role, {
      maxAge: 300, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    })
  }

  return { response }
}

// ─── Step: Locale resolution ───

function resolveLocale(request: NextRequest, response: NextResponse): NextResponse {
  const localeCookie = request.cookies.get('fdm-locale')?.value
  let resolvedLocale: string

  if (localeCookie && SUPPORTED_LOCALES.includes(localeCookie)) {
    resolvedLocale = localeCookie
  } else {
    // No cookie — detect from Accept-Language for unauthenticated users
    resolvedLocale = parseAcceptLanguage(request.headers.get('accept-language'))
    // Set cookie so next request doesn't need detection
    response.cookies.set('fdm-locale', resolvedLocale, {
      maxAge: 86400 * 365, httpOnly: false, secure: true, sameSite: 'lax', path: '/',
    })
  }

  // Set x-locale header for server components (next-intl reads this)
  request.headers.set('x-locale', resolvedLocale)
  // Recreate response to include the new header, preserve cookies
  const prevCookies = response.cookies.getAll()
  const newResponse = NextResponse.next({ request })
  prevCookies.forEach(c => newResponse.cookies.set(c))
  return newResponse
}

// ─── Step: Route protection ───

function handleRouteProtection(
  pathname: string,
  isAuthenticated: boolean,
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const publicAppPaths = ['/explore', '/moments', '/video', '/note', '/notes', '/posts', '/sounds', '/dashboard']
  const isPublicApp = publicAppPaths.includes(pathname) || pathname.startsWith('/explore/') || pathname.startsWith('/video/') || pathname.startsWith('/note/') || pathname.startsWith('/moments/') || pathname.startsWith('/dashboard/')
  const appPaths = ['/', '/explore', '/moments', '/video', '/note', '/notes', '/posts', '/notifications', '/bookmarks', '/analytics', '/coins', '/settings', '/profile', '/security', '/sounds', '/moderation', '/admin', '/app-payment', '/subscription-payment', '/transactions', '/withdrawal', '/suggestions', '/create', '/dashboard', '/report']
  const isAppPath = appPaths.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isProtected = isAppPath && !isPublicApp
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isOnboarding = pathname === '/onboarding'

  // Unauthenticated on home → show landing page
  if (!isAuthenticated && pathname === '/') {
    return rewriteWithCookies('/landing', request, response)
  }

  // Authenticated on landing → go to home
  if (isAuthenticated && pathname === '/landing') {
    return redirectWithCookies('/', request, response)
  }

  // Unauthenticated → login (protected routes)
  if (!isAuthenticated && isProtected) {
    return redirectWithCookies('/login', request, response)
  }

  // Unauthenticated → login (onboarding)
  if (!isAuthenticated && isOnboarding) {
    return redirectWithCookies('/login', request, response)
  }

  // Authenticated → home (auth pages)
  if (isAuthenticated && isAuthPage) {
    return redirectWithCookies('/', request, response)
  }

  return response
}

// ═══════════════════════════════════════════════════════════════════
// Main Middleware
// ═══════════════════════════════════════════════════════════════════

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Redirect stray OAuth codes to /auth/callback
  const oauthRedirect = handleOAuthRedirect(request)
  if (oauthRedirect) return oauthRedirect

  // 2. Locale prefix handling for public pages
  const localeRedirect = handleLocalePrefix(request, pathname)
  if (localeRedirect) return localeRedirect

  // 3. WAF + API rate limiting
  const securityBlock = checkApiSecurity(pathname, request)
  if (securityBlock) return securityBlock

  // Strip any spoofed auth headers from the client
  request.headers.delete('x-user-id')
  request.headers.set('x-auth-verified', '0')

  // Guest/public fast path: skip Supabase client when no auth cookie
  const hasAuthCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))
  if (!hasAuthCookies) {
    let guestResponse = resolveLocale(request, NextResponse.next({ request }))
    if (pathname.startsWith('/api/')) return guestResponse
    return handleRouteProtection(pathname, false, request, guestResponse)
  }

  // 4. Create Supabase client with cookie-based session
  // This is the ONLY place where tokens get refreshed server-side.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 5. Refresh session — CRITICAL
  let user: { id: string } | null = null
  const { data } = await supabase.auth.getUser()
  user = data.user

  // Pass validated user ID to server components via request header.
  if (user) {
    request.headers.set('x-user-id', user.id)
    request.headers.set('x-auth-verified', '1')
  }
  // Recreate response with modified request headers, preserve cookies
  const responseCookies = supabaseResponse.cookies.getAll()
  supabaseResponse = NextResponse.next({ request })
  responseCookies.forEach(c => supabaseResponse.cookies.set(c))

  // 6. Account status + onboarding + role checks
  if (user && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/account/freeze') && !pathname.startsWith('/api/account/delete')) {
    const result = await handleAccountChecks(supabase, user, pathname, request, supabaseResponse)
    supabaseResponse = result.response
    if (result.earlyReturn) return result.earlyReturn
  }

  // 7. Locale resolution
  supabaseResponse = resolveLocale(request, supabaseResponse)

  // 8. API routes — return with refreshed cookies (no further middleware logic needed)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // 9. Route protection
  return handleRouteProtection(pathname, !!user, request, supabaseResponse)
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
    '/dashboard',
    // Auth & other
    '/landing',
    '/login',
    '/register',
    '/onboarding',
    '/u/:path*',
    '/account-moderation',
    '/premium',
    '/payment/:path*',
    '/report/:path*',
    // Dynamic post sub-routes that need auth
    '/:slug/moderation',
  ],
}
