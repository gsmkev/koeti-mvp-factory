---
paths:
  - "**/lib/db/schema.ts"
  - "**/lib/crud.ts"
  - "**/app/(dashboard)/**"
---

# CRUD recipe

Adding a team-scoped entity (the 90% case for MVP features)? Follow these 5 steps in order — a whole entity is ~40 lines. Don't invent a different structure.

## 1. Schema

Add the table to `lib/db/schema.ts`. Team-scoped entities always carry `teamId`:

```ts
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
export type Project = typeof projects.$inferSelect
```

Then: `pnpm --filter @koeti/<app> db:generate && pnpm --filter @koeti/<app> db:migrate`.
**Commit the generated migration files** — CI fails on migration drift.

## 2. Query

In `lib/db/queries.ts`. Every query on a team-scoped table filters by `teamId` — no exceptions:

```ts
export async function getProjects(teamId: number) {
  return db.select().from(projects).where(eq(projects.teamId, teamId)).orderBy(desc(projects.createdAt))
}
```

## 3. Actions — use the factory

`app/(dashboard)/<entity>/actions.ts`. `crudActions` (from `@/lib/crud`) scopes every mutation by `teamId` automatically:

```ts
'use server'

import { z } from 'zod'
import { crudActions } from '@/lib/crud'
import { projects } from '@/lib/db/schema'

const actions = crudActions(projects, {
  path: '/projects',
  schema: z.object({ name: z.string().min(1, 'Name is required') }),
})
export const createProject = actions.create
export const updateProject = actions.update
export const deleteProject = actions.remove
```

Use `z.coerce.number()` / `z.coerce.date()` for non-string fields. Logic beyond
validated insert/update/delete (state transitions, totals, external calls) gets a
hand-written action in the same file using `withTeam` — scope its `where` by
`team.id`, never trust an id from the form alone.

## 4. Page — use ResourcePanel

`app/(dashboard)/<entity>/page.tsx` — a server component:

```tsx
import { ResourcePanel } from '@koeti/ui'
import { getTeamForUser, getProjects } from '@/lib/db/queries'
import { createProject, deleteProject } from './actions'

export default async function ProjectsPage() {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')
  const rows = await getProjects(team.id)

  return (
    <ResourcePanel
      title="Projects"
      description="Your team's projects."
      fields={[{ name: 'name', label: 'Name', placeholder: 'New project', required: true }]}
      onCreate={createProject}
      createLabel="Create"
      columns={[
        { header: 'Name', cell: (p) => p.name },
        { header: 'Created', cell: (p) => p.createdAt.toLocaleDateString() },
      ]}
      rows={rows}
      rowKey={(p) => p.id}
      onUpdate={updateProject}   // per-row edit dialog, prefilled from the row via `fields`
      onDelete={deleteProject}
      emptyTitle="No projects yet"
    />
  )
}
```

Wire `onUpdate` by default — edit is part of the expected MVP experience.
URL-driven filters on the list (e.g. `?category=x`)? Follow
`.claude/rules/url-state.md` (worked example: `apps/gastos`).

Field types: `text` (default), `number`, `date`, `email`, `textarea`, `select`
(pass `options`). A page that outgrows ResourcePanel (inline editing, drag,
charts) drops down to the base composites: `PageHeader`, `DataTable`,
`EmptyState`, `StatCard`, `SubmitButton`.

## 5. Navigation

Add the entry to the dashboard nav (`app/(dashboard)/dashboard/layout.tsx` `navItems`).

## Verify

`pnpm --filter @koeti/<app> typecheck && pnpm --filter @koeti/<app> build`, then
`pnpm verify-app <app>` (renders every page with a real session, catches SSR
crashes) and `pnpm e2e-app <app>` (headless Chromium signs up and exercises
create/edit/delete through every ResourcePanel form — keep the panel's `data-slot`
attributes intact for this to work).
