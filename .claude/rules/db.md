---
paths:
  - '**/lib/db/**'
  - '**/drizzle.config.ts'
  - '**/lib/db/schema.ts'
---

# DB pattern — follow exactly

## `lib/db/drizzle.ts` (every app) — import as `@/lib/db/drizzle`

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { baseSchema } from '@koeti/db';
import * as appSchema from './schema';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema: { ...baseSchema, ...appSchema } });
```

## `drizzle.config.ts` (every app)

```ts
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

export default defineConfig({
  schema: ['../../packages/db/src/schema.ts', './lib/db/schema.ts'],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL! },
});
```

## `lib/db/schema.ts` (app-specific tables only)

```ts
import { pgTable, serial, integer, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from '@koeti/db'; // for FK references only

// Only THIS app's tables. Never redefine users/teams/teamMembers.
export const myTable = pgTable('my_table', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
});

export type MyTable = typeof myTable.$inferSelect;
export type NewMyTable = typeof myTable.$inferInsert;
```

- `@koeti/db` exports `baseSchema` (spread object) + all base types
- Do NOT import `db` from `@koeti/db` — each app creates its own instance
- After schema changes: `pnpm --filter @koeti/<name> db:migrate`
