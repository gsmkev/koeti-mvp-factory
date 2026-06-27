import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { signToken, verifyToken } from './session'

export function createAuthMiddleware(config: { protectedRoutes: string[] }) {
  const protectedPrefixes = config.protectedRoutes

  async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const sessionCookie = request.cookies.get('session')
    const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

    if (isProtected && !sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }

    let res = NextResponse.next()

    if (sessionCookie && request.method === 'GET') {
      try {
        const parsed = await verifyToken(sessionCookie.value)
        const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000)
        res.cookies.set({
          name: 'session',
          value: await signToken({ ...parsed, expires: expiresInOneDay.toISOString() }),
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          expires: expiresInOneDay,
        })
      } catch {
        res.cookies.delete('session')
        if (isProtected) {
          return NextResponse.redirect(new URL('/sign-in', request.url))
        }
      }
    }

    return res
  }

  const config_ = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
    runtime: 'nodejs' as const,
  }

  return { middleware, config: config_ }
}
