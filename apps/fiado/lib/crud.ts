// Team-scoped CRUD server-action factory.
// Every mutation is automatically scoped to the caller's team, so forgetting
// the teamId filter is impossible. Use from a 'use server' file:
//
//   const actions = crudActions(projects, {
//     path: '/projects',
//     schema: z.object({ name: z.string().min(1) }),
//   })
//   export const createProject = actions.create
//   export const updateProject = actions.update
//   export const deleteProject = actions.remove
//
// Use z.coerce.number() / z.coerce.date() for non-string form fields.
// Entities that need logic beyond validated insert/update/delete get a
// hand-written action next to these — don't force everything through here.
import { and, eq, getTableName } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { TeamRole } from '@koeti/auth';
import { activityLogs } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { withTeam } from '@/lib/auth/middleware';

type TeamScopedTable = PgTable & { id: AnyPgColumn; teamId: AnyPgColumn };

export function crudActions<T extends TeamScopedTable>(
  table: T,
  opts: { path: string; schema: z.ZodObject<z.ZodRawShape>; minRole?: TeamRole },
) {
  const { path, schema, minRole = 'member' } = opts;

  // Business audit trail: every mutation through the factory lands in
  // activity_logs as ENTITY_<verb>:<table> — /dashboard/activity renders it.
  const entity = getTableName(table);
  const audit = (teamId: number, userId: number, verb: 'CREATED' | 'UPDATED' | 'DELETED') =>
    db.insert(activityLogs).values({ teamId, userId, action: `ENTITY_${verb}:${entity}` });

  const create = withTeam(async (formData, team, user) => {
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0].message };
    // zod validated the shape at runtime; drizzle can't see through a generic table
    await db.insert(table).values({ ...parsed.data, teamId: team.id } as T['$inferInsert']);
    await audit(team.id, user.id, 'CREATED');
    revalidatePath(path);
  }, minRole);

  const update = withTeam(async (formData, team, user) => {
    const id = Number(formData.get('id'));
    if (!Number.isInteger(id)) return { error: 'Missing record id' };
    const values = Object.fromEntries(formData);
    delete values.id;
    const parsed = schema.partial().safeParse(values);
    if (!parsed.success) return { error: parsed.error.errors[0].message };
    const patch = parsed.data as Record<string, unknown>;
    if ('updatedAt' in table) patch.updatedAt = new Date();
    await db
      .update(table)
      .set(patch as Partial<T['$inferInsert']>)
      .where(and(eq(table.id, id), eq(table.teamId, team.id)));
    await audit(team.id, user.id, 'UPDATED');
    revalidatePath(path);
  }, minRole);

  const remove = withTeam(async (formData, team, user) => {
    const id = Number(formData.get('id'));
    if (!Number.isInteger(id)) return { error: 'Missing record id' };
    await db.delete(table).where(and(eq(table.id, id), eq(table.teamId, team.id)));
    await audit(team.id, user.id, 'DELETED');
    revalidatePath(path);
  }, minRole);

  return { create, update, remove };
}
