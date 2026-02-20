import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { checkUrl, isExemptPath } from '@/lib/waf'

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  // ─── 3b. Account status check (frozen / moderation / blocked / deleted) ───
  if (user && !pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/account/freeze') && !pathname.startsWith('/api/account/delete')) {
    const statusCookie = request.cookies.get('fdm-status')?.value
    let status = statusCookie || ''

    if (!status) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', user.id)
        .single()
      status = profile?.status || 'active'
    }

    if (status !== 'active') {
      // Cache status for 60s to avoid repeated queries
      supabaseResponse.cookies.set('fdm-status', status, {
        maxAge: 60, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })

      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Hesabiniz aktif degil', status },
          { status: 403 }
        )
      }

      // Allow signout even for inactive accounts
      if (pathname !== '/auth/signout' && pathname !== '/login') {
        const statusRedirect = NextResponse.redirect(new URL('/login', request.url))
        supabaseResponse.cookies.getAll().forEach(c => statusRedirect.cookies.set(c))
        return statusRedirect
      }
    }
  }

  // For API routes, return with refreshed cookies (no further middleware logic needed)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // ─── 4. Route protection ───
  const isAuthenticated = !!user
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin')
  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isOnboarding = pathname === '/onboarding'
  const publicDashboardPaths = ['/dashboard', '/dashboard/explore']
  const isPublicDashboard = publicDashboardPaths.includes(pathname) || pathname.startsWith('/dashboard/explore/')

  // Helper: redirect that preserves refreshed auth cookies
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    // Copy all cookies from supabaseResponse (includes refreshed auth + custom cookies)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c))
    return response
  }

  // Unauthenticated → login (protected routes, except public dashboard)
  if (!isAuthenticated && isProtected && !isPublicDashboard) {
    return redirect('/login')
  }

  // Unauthenticated → login (onboarding)
  if (!isAuthenticated && isOnboarding) {
    return redirect('/login')
  }

  // Authenticated → dashboard (auth pages)
  if (isAuthenticated && isAuthPage) {
    return redirect('/dashboard')
  }

  // ─── 5. Onboarding check ───
  if (isAuthenticated && user && !isOnboarding && !isAuthPage) {
    const onboardingDone = request.cookies.get('fdm-onboarding')?.value
    if (onboardingDone === undefined) {
      // Query profile directly using the already-created Supabase client
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single()

      if (profile && !profile.onboarding_completed) {
        return redirect('/onboarding')
      }

      // Cache for 5 minutes to avoid re-checking on every request
      supabaseResponse.cookies.set('fdm-onboarding', '1', {
        maxAge: 300, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      })
    }
  }

  // ─── 6. Admin role check ───
  if (isAuthenticated && user && pathname.startsWith('/dashboard/admin')) {
    let role = request.cookies.get('fdm-role')?.value || ''

    if (!role) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()
      role = profile?.role || 'user'
    }

    if (role !== 'admin' && role !== 'moderator') {
      return redirect('/dashboard')
    }

    supabaseResponse.cookies.set('fdm-role', role, {
      maxAge: 300, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/',
    '/api/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/onboarding',
    '/post/:path*',
    '/u/:path*',
  ],
}
