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
import { and, eq } from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db/drizzle'
import { withTeam } from '@/lib/auth/middleware'

type TeamScopedTable = PgTable & { id: AnyPgColumn; teamId: AnyPgColumn }

export function crudActions<T extends TeamScopedTable>(
  table: T,
  opts: { path: string; schema: z.ZodObject<z.ZodRawShape> }
) {
  const { path, schema } = opts

  const create = withTeam(async (formData, team) => {
    const parsed = schema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { error: parsed.error.errors[0].message }
    // zod validated the shape at runtime; drizzle can't see through a generic table
    await db.insert(table).values({ ...parsed.data, teamId: team.id } as T['$inferInsert'])
    revalidatePath(path)
  })

  const update = withTeam(async (formData, team) => {
    const id = Number(formData.get('id'))
    if (!Number.isInteger(id)) return { error: 'Missing record id' }
    const values = Object.fromEntries(formData)
    delete values.id
    const parsed = schema.partial().safeParse(values)
    if (!parsed.success) return { error: parsed.error.errors[0].message }
    await db
      .update(table)
      .set(parsed.data as Partial<T['$inferInsert']>)
      .where(and(eq(table.id, id), eq(table.teamId, team.id)))
    revalidatePath(path)
  })

  const remove = withTeam(async (formData, team) => {
    const id = Number(formData.get('id'))
    if (!Number.isInteger(id)) return { error: 'Missing record id' }
    await db.delete(table).where(and(eq(table.id, id), eq(table.teamId, team.id)))
    revalidatePath(path)
  })

  return { create, update, remove }
}
