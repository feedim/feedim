import { NextResponse, type NextRequest } from 'next/server'

// ♥ Global IP-based rate limiter for API routes
const apiRateMap = new Map<string, { count: number; resetAt: number }>()
const API_RATE_LIMIT = 60      // requests per window
const API_RATE_WINDOW = 60_000 // 1 minute

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

// Prevent unbounded memory growth — clean stale entries every 5 minutes
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

  // ♥ API Rate Limiting — applies to all /api/* routes
  if (pathname.startsWith('/api/')) {
    // PayTR callback muaf — retry'lar rate limit'e takılmasın
    if (pathname === '/api/payment/payttr/callback') {
      return NextResponse.next()
    }
    cleanupRateMap()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkApiRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }
    return NextResponse.next()
  }

  const isHomePage = pathname === '/'
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/creator')
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/verify-mfa'

  if (!isProtected && !isAuthPage && !isHomePage) {
    return NextResponse.next()
  }

  // Derive cookie prefix from Supabase URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || ''
  const cookiePrefix = `sb-${projectRef}-auth-token`

  // Reassemble Supabase auth cookie (may be chunked: .0, .1, .2, ...)
  let tokenStr = ''
  const baseCookie = request.cookies.get(cookiePrefix)
  if (baseCookie) {
    tokenStr = baseCookie.value
  } else {
    for (let i = 0; i < 10; i++) {
      const chunk = request.cookies.get(`${cookiePrefix}.${i}`)
      if (!chunk) break
      tokenStr += chunk.value
    }
  }

  let isAuthenticated = false
  let accessToken = ''
  let userId = ''

  if (tokenStr) {
    try {
      // @supabase/ssr v0.5+ prefixes cookie values with "base64-"
      let jsonStr = tokenStr
      if (jsonStr.startsWith('base64-')) {
        jsonStr = atob(jsonStr.slice(7))
      }

      const session = JSON.parse(jsonStr)
      accessToken = session.access_token || ''

      if (accessToken) {
        // Decode JWT payload (base64url → base64 → JSON)
        const base64 = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(base64))
        isAuthenticated = Date.now() < payload.exp * 1000
        userId = payload.sub || ''
      }
    } catch {
      isAuthenticated = false
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (!isAuthenticated && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages and home page
  if (isAuthenticated && (isAuthPage || isHomePage)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access control for admin/creator routes (includes /dashboard/admin/*)
  if (isAuthenticated && userId && (pathname.startsWith('/admin') || pathname.startsWith('/creator') || pathname.startsWith('/dashboard/admin'))) {
    // Check cached role cookie first (avoids Supabase REST call on every request)
    let role = request.cookies.get('fl-role')?.value || ''

    if (!role) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/profiles?select=role&user_id=eq.${userId}`,
          {
            headers: {
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )
        const profiles = await res.json()
        role = profiles?.[0]?.role || 'user'
      } catch {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    if ((pathname.startsWith('/admin') || pathname.startsWith('/dashboard/admin')) && role !== 'admin') {
      // Affiliates can access promos page
      if (role === 'affiliate' && pathname === '/dashboard/admin/promos') {
        const response = NextResponse.next()
        response.cookies.set('fl-role', role, { maxAge: 300, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
        return response
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/creator') && role !== 'creator' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Cache role in cookie for 5 minutes
    const response = NextResponse.next()
    response.cookies.set('fl-role', role, { maxAge: 300, httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/api/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
    '/creator/:path*',
    '/login',
    '/register',
    '/verify-mfa',
  ],
}
