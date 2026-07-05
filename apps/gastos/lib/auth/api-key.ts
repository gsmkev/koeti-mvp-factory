// gastos lib — api key.
import { and, eq, isNull } from 'drizzle-orm';
import { hashApiKey } from '@koeti/auth';
import { apiKeys, teams, type Team } from '@koeti/db';
import { db } from '@/lib/db/drizzle';

// Re-exported so routes can `import { apiRateLimitOk, getTeamFromApiKey }` from
// one place; the implementation lives in api-rate-limit.ts (db-free, testable).
export { apiRateLimitOk } from './api-rate-limit';

// Authenticates an external caller (another MVP, a script) sending
// `Authorization: Bearer koeti_...`. Returns the key's team, or null.
// Route handlers that expose data over HTTP accept this OR the session cookie:
//
//   const team = (await getTeamFromApiKey(request)) ?? (await getTeamForUser())
export async function getTeamFromApiKey(request: Request): Promise<Team | null> {
  const header = request.headers.get('authorization');
  const key = header?.match(/^Bearer (koeti_[0-9a-f]{64})$/)?.[1];
  if (!key) return null;
  const result = await db
    .select({ team: teams, keyId: apiKeys.id })
    .from(apiKeys)
    .innerJoin(teams, eq(apiKeys.teamId, teams.id))
    .where(and(eq(apiKeys.keyHash, await hashApiKey(key)), isNull(apiKeys.revokedAt)))
    .limit(1);
  if (!result[0]) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, result[0].keyId));
  return result[0].team;
}
