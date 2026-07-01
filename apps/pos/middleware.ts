import { createAuthMiddleware } from '@koeti/auth'

const { middleware: _middleware } = createAuthMiddleware({
  protectedRoutes: ['/dashboard', '/pos', '/sales', '/inventory', '/suppliers'],
})

export const middleware = _middleware

// ponytail: static literal required by Turbopack — cannot be dynamic reference
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs',
}
