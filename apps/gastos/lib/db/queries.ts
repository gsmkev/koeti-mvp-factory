// gastos lib — queries.
import { desc, and, eq, isNull, sql } from 'drizzle-orm';
import { db } from './drizzle';
import { verifyToken } from '@koeti/auth';
import { cookies } from 'next/headers';
import { activityLogs, apiKeys, insights, teamMembers, teams, users } from '@koeti/db';
import { expenses } from './schema';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie?.value) return null;
  const sessionData = await verifyToken(sessionCookie.value);
  if (!sessionData?.user || typeof sessionData.user.id !== 'number') return null;
  if (new Date(sessionData.expires) < new Date()) return null;
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);
  return user[0] ?? null;
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);
  return result[0] ?? null;
}

export async function updateTeamSubscription(
  teamId: number,
  data: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  },
) {
  await db
    .update(teams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({ user: users, teamId: teamMembers.teamId })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) throw new Error('User not authenticated');
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

// Cross-tenant by design — callers MUST gate with isSuperadmin() first.
export async function getAdminTeamsOverview() {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      createdAt: teams.createdAt,
      memberCount: sql<number>`count(${teamMembers.id})::int`,
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .groupBy(teams.id)
    .orderBy(desc(teams.createdAt));
}

export async function getApiKeys(teamId: number) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.teamId, teamId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) return null;
  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  return result?.team ?? null;
}

export async function getInsights(teamId: number) {
  return db
    .select()
    .from(insights)
    .where(and(eq(insights.teamId, teamId), isNull(insights.dismissedAt)))
    .orderBy(desc(insights.createdAt))
    .limit(50);
}

// --- expenses ---
export const EXPENSES_PAGE_SIZE = 50;

// `page` pagina la vista (trae PAGE_SIZE + 1 filas: la extra señala hasMore);
// sin `page` devuelve todo — el export CSV depende de eso.
export async function getExpenses(teamId: number, category?: string, page?: number) {
  const q = db
    .select()
    .from(expenses)
    .where(and(eq(expenses.teamId, teamId), category ? eq(expenses.category, category) : undefined))
    .orderBy(desc(expenses.spentAt), desc(expenses.id));
  if (!page) return q;
  return q.limit(EXPENSES_PAGE_SIZE + 1).offset((page - 1) * EXPENSES_PAGE_SIZE);
}

export async function getMonthTotal(teamId: number) {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` })
    .from(expenses)
    .where(
      and(
        eq(expenses.teamId, teamId),
        sql`${expenses.spentAt} >= date_trunc('month', now())::date`,
      ),
    );
  return Number(row?.total ?? 0);
}
