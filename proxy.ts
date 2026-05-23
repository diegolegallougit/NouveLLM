import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith('/legal')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/session/')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/apropos')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/login')) {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET })
    if (token) return NextResponse.redirect(new URL('/', req.url))
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/')) {
    // Whitelist: routes that are intentionally public (no auth required)
    // All other /api/ routes return 401 if the request has no valid session token
    const PUBLIC_API_PREFIXES = [
      '/api/auth/',           // NextAuth callbacks, session, csrf, signout
      '/api/admin/webhook/',  // Dify webhook (HMAC-signed, verified in the route)
      '/api/session/',        // Student session lookup + guest-chat (no login required)
      '/api/docs',            // OpenAPI spec
    ]
    if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }
    const apiToken = await getToken({ req, secret: process.env.AUTH_SECRET })
    if (!apiToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  const token = await getToken({ req, secret: process.env.AUTH_SECRET })
  if (!token) {
    const callbackUrl = pathname.startsWith('/c/') ? `?callbackUrl=${encodeURIComponent(pathname)}` : ''
    return NextResponse.redirect(new URL(`/login${callbackUrl}`, req.url))
  }

  // Admin pages require ADMIN role
  if (pathname.startsWith('/admin')) {
    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Responsable panel requires RESPONSABLE or ADMIN role
  if (pathname.startsWith('/responsable')) {
    if (token.role !== 'RESPONSABLE' && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Sessions list requires EC or ADMIN role (/session/ without 's' is public — student join link)
  if (pathname.startsWith('/sessions')) {
    if (token.role !== 'EC' && token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts).*)'],
}
