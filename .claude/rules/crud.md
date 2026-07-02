---
paths:
  - "**/lib/db/schema.ts"
  - "**/app/(dashboard)/**"
---

# CRUD recipe

Adding a team-scoped entity (the 90% case for MVP features)? Follow these 5 steps in order. Don't invent a different structure.

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
export type NewProject = typeof projects.$inferInsert
```

Then: `pnpm --filter @koeti/<app> db:generate && pnpm --filter @koeti/<app> db:migrate`.
**Commit the generated migration files** — CI fails on migration drift.

## 2. Queries

In `lib/db/queries.ts`. Every query on a team-scoped table filters by `teamId` — no exceptions:

```ts
export async function getProjects(teamId: number) {
  return db.select().from(projects).where(eq(projects.teamId, teamId)).orderBy(desc(projects.createdAt))
}
```

## 3. Server actions

In `app/(dashboard)/<entity>/actions.ts` (`'use server'`). Use `withTeam` from `@/lib/auth/middleware` — it resolves the user's team and rejects unauthenticated calls:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { withTeam } from '@/lib/auth/middleware'
import { db } from '@/lib/db/drizzle'
import { projects } from '@/lib/db/schema'

export const createProject = withTeam(async (formData, team) => {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Name is required' }
  await db.insert(projects).values({ teamId: team.id, name })
  revalidatePath('/projects')
})
```

Delete/update actions must scope the `where` to `team.id` too — never trust an id from the form alone:

```ts
await db.delete(projects).where(and(eq(projects.id, id), eq(projects.teamId, team.id)))
```

## 4. Page

`app/(dashboard)/<entity>/page.tsx` — a server component using the `@koeti/ui` composites:

```tsx
import { DataTable, EmptyState, PageHeader, SubmitButton, Card, CardContent, Input } from '@koeti/ui'
import { getTeamForUser } from '@/lib/db/queries'
import { getProjects } from '@/lib/db/queries'
import { createProject } from './actions'

export default async function ProjectsPage() {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')
  const rows = await getProjects(team.id)

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title="Projects" description="Your team's projects." />
      <Card>
        <CardContent>
          <form action={createProject} className="flex gap-2">
            <Input name="name" placeholder="New project name" required />
            <SubmitButton pendingText="Creating…">Create</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <DataTable
        columns={[
          { header: 'Name', cell: (p) => p.name },
          { header: 'Created', cell: (p) => p.createdAt.toLocaleDateString() },
        ]}
        rows={rows}
        rowKey={(p) => p.id}
        empty={<EmptyState title="No projects yet" description="Create your first project above." />}
      />
    </section>
  )
}
```

## 5. Navigation

Add the entry to the dashboard nav (`app/(dashboard)/dashboard/layout.tsx` `navItems`).

## Composites cheat sheet

| Component | Use for |
|---|---|
| `PageHeader` | Title + description + action buttons at top of every dashboard page |
| `DataTable<T>` | Any list of records; pass `empty` slot instead of hand-rolling zero states |
| `EmptyState` | Zero-state boxes (also standalone, e.g. before onboarding) |
| `StatCard` | KPI tiles on overview/dashboard pages |
| `SubmitButton` | Every `<form action={...}>` submit — pending spinner for free |

## Verify

`pnpm --filter @koeti/<app> typecheck && pnpm --filter @koeti/<app> build` before claiming done.
