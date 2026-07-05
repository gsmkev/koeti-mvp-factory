// API route (GET) — /api/health.
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';

export const dynamic = 'force-dynamic';

// Liveness + DB reachability, for uptime monitors and load balancers.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'error', db: 'unreachable' }, { status: 503 });
  }
}
