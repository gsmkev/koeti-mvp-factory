// Next.js middleware: session refresh + route protection.
import { createAuthMiddleware } from '@koeti/auth';

const { middleware: _middleware } = createAuthMiddleware({ protectedRoutes: ['/dashboard'] });

// proxy.ts (unlike the old middleware.ts) requires a default export
export default _middleware;

// ponytail: static literal required by Turbopack — cannot be dynamic reference
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
  runtime: 'nodejs',
};
