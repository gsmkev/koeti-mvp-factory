// Daily insights sweep. Vercel cron (see vercel.json) calls this with
// Authorization: Bearer ${CRON_SECRET}; run it locally with curl the same way.
// AI insights/suggestions are an Empresarial-only feature (spec Decision) —
// Free/Premium teams simply never get swept, so no AI quota is spent on them.
import { cleanupRateLimits, insights, teams } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { generateInsights } from '@/lib/ai/insights';
import { notifyTeam } from '@/lib/notifications';
import { isEnterprise } from '@/lib/plan';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ponytail: sequential sweep over all teams — fine at MVP scale; batch or
  // queue it when a sweep stops fitting in one function invocation.
  await cleanupRateLimits(db); // piggyback: drop expired rate-limit windows daily
  const allTeams = (await db.select().from(teams)).filter(isEnterprise);
  let created = 0;
  for (const team of allTeams) {
    const found = await generateInsights(team);
    if (found.length === 0) continue;
    const inserted = await db
      .insert(insights)
      .values(found)
      .onConflictDoNothing()
      .returning({ id: insights.id });
    created += inserted.length;
    if (inserted.length > 0) {
      await notifyTeam(
        team.id,
        'insightsNew',
        { count: inserted.length },
        {
          href: '/dashboard/insights',
        },
      );
    }
  }
  return Response.json({ teams: allTeams.length, created });
}
