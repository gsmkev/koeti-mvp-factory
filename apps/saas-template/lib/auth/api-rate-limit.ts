// saas-template lib — api rate limit.
import { rateLimit } from '@koeti/auth';

// Per-IP throttle for public API routes (data exports, integrations). Call at
// the top of the route: `if (!apiRateLimitOk(request)) return new Response(...)`.
// Only API-key callers (Bearer header) are throttled — session/dashboard
// requests pass through, so users behind a shared NAT never trip this.
// Lives apart from api-key.ts so it stays db-free and unit-testable.
// ponytail: in-memory, per-instance (same limiter as the auth actions) — blunts
// abuse without a Redis dependency; swap for a shared store if you outgrow it.
export function apiRateLimitOk(request: Request, limit = 60) {
  if (!request.headers.get('authorization')) return true;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  return rateLimit(`api:${ip}`, { limit });
}
