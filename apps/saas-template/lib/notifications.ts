// In-app notifications. Content is an i18n message key (in the `notifications`
// namespace) + JSON params, same pattern as insights, so the bell renders in
// the viewer's locale. Team-wide events insert one row per member.
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { notifications, teamMembers } from '@koeti/db';
import { db } from '@/lib/db/drizzle';

export async function notifyUser(
  userId: number,
  teamId: number,
  messageKey: string,
  params: Record<string, unknown> = {},
  href?: string,
) {
  await db
    .insert(notifications)
    .values({ userId, teamId, messageKey, params: JSON.stringify(params), href });
}

export async function notifyTeam(
  teamId: number,
  messageKey: string,
  params: Record<string, unknown> = {},
  opts: { href?: string; exceptUserId?: number } = {},
) {
  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  const rows = members
    .filter((m) => m.userId !== opts.exceptUserId)
    .map((m) => ({
      userId: m.userId,
      teamId,
      messageKey,
      params: JSON.stringify(params),
      href: opts.href,
    }));
  if (rows.length > 0) await db.insert(notifications).values(rows);
}

export async function getNotificationsForUser(userId: number, limit = 15) {
  const [items, [{ unread }]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
    db
      .select({ unread: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ]);
  return { items, unread };
}

export async function markAllNotificationsRead(userId: number) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
