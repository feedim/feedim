import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/creator')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  if (!isProtected && !isAuthPage) {
    return NextResponse.next()
  }

  // Extract Supabase project ref from URL for cookie name
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const ref = supabaseUrl.match(/\/\/([^.]+)/)?.[1] || ''
  const cookiePrefix = `sb-${ref}-auth-token`

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
      const session = JSON.parse(tokenStr)
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

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Role-based access control for admin/creator routes
  if (isAuthenticated && userId && (pathname.startsWith('/admin') || pathname.startsWith('/creator'))) {
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
      const role = profiles?.[0]?.role || 'user'

      if (pathname.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      if (pathname.startsWith('/creator') && role !== 'creator' && role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/creator/:path*',
    '/login',
    '/register',
  ],
}
