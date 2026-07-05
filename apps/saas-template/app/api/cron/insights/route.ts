// Daily insights sweep. Vercel cron (see vercel.json) calls this with
// Authorization: Bearer ${CRON_SECRET}; run it locally with curl the same way.
import { insights, teams } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { generateInsights } from '@/lib/ai/insights';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ponytail: sequential sweep over all teams — fine at MVP scale; batch or
  // queue it when a sweep stops fitting in one function invocation.
  const allTeams = await db.select({ id: teams.id }).from(teams);
  let created = 0;
  for (const team of allTeams) {
    const found = await generateInsights(team.id);
    if (found.length === 0) continue;
    const inserted = await db
      .insert(insights)
      .values(found)
      .onConflictDoNothing()
      .returning({ id: insights.id });
    created += inserted.length;
  }
  return Response.json({ teams: allTeams.length, created });
}
