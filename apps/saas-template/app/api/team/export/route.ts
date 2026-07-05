// API route (GET) — /api/team/export. Full JSON dump of the team's data
// (GDPR / portability). Session auth, admin+ only. Introspects the Drizzle
// schema: every table with a teamId column is exported, scoped to the team —
// new entities are included automatically, nothing to maintain.
import { eq, getTableColumns, getTableName, is, Table } from 'drizzle-orm';
import { baseSchema, consumeRateLimit } from '@koeti/db';
import { roleAtLeast } from '@koeti/auth';
import { db } from '@/lib/db/drizzle';
import * as appSchema from '@/lib/db/schema';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { teamRoleFor } from '@/lib/auth/middleware';

export async function GET() {
  const user = await getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const team = await getTeamForUser();
  if (!team) return new Response('Unauthorized', { status: 401 });
  if (!roleAtLeast(teamRoleFor(user, team), 'admin')) {
    return new Response('Forbidden', { status: 403 });
  }
  // Heavy query — durable throttle per team.
  if (!(await consumeRateLimit(db, `export:${team.id}`, { limit: 5 }))) {
    return new Response('Too many requests', { status: 429 });
  }

  const out: Record<string, unknown[]> = {
    team: [{ id: team.id, name: team.name, planName: team.planName, createdAt: team.createdAt }],
  };
  for (const t of Object.values({ ...baseSchema, ...appSchema })) {
    if (!is(t, Table)) continue;
    // ponytail: dynamic table — drizzle generics can't follow (same call as seed.ts)
    const cols = getTableColumns(t) as unknown as Record<string, never>;
    if (!('teamId' in cols)) continue;
    const rows = (await db
      .select()
      .from(t as never)
      .where(eq(cols.teamId, team.id))) as Record<string, unknown>[];
    out[getTableName(t)] = rows.map((r) =>
      // Redact secret-ish columns (api_keys.key_hash and friends).
      Object.fromEntries(Object.entries(r).filter(([k]) => !k.toLowerCase().includes('hash'))),
    );
  }
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': 'attachment; filename="team-export.json"',
    },
  });
}
