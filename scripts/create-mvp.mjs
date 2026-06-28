#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const name = process.argv[2]
if (!name) {
  console.error('Usage: pnpm create-mvp <saas-name>')
  process.exit(1)
}
if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Name must be lowercase alphanumeric with dashes (e.g. my-saas)')
  process.exit(1)
}

const dbName = name.replaceAll('-', '_')
const dbUrl = `postgresql://${dbName}:localdev@localhost:5432/${dbName}`

const src = join(root, 'apps', 'saas-template')
const dest = join(root, 'apps', name)

if (existsSync(dest)) {
  console.error(`apps/${name} already exists`)
  process.exit(1)
}

console.log(`\n🏗  Scaffolding @koeti/${name}...\n`)

// Copy template, excluding: node_modules, .next, lib/db/migrations, .env.local
cpSync(src, dest, {
  recursive: true,
  filter: (src) => {
    const normalized = src.replace(/\\/g, '/')
    return !normalized.includes('node_modules') &&
           !normalized.includes('.next') &&
           !normalized.includes('lib/db/migrations') &&
           !normalized.includes('.env.local')
  },
})

// Update package.json
const pkgPath = join(dest, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
pkg.name = `@koeti/${name}`
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// Replace saas-template references in key text files that may embed the template name
const filesToPatch = [
  'README.md',
  'middleware.ts',   // createAuthMiddleware comment may reference saas-template
  'next.config.ts',  // transpilePackages may reference @koeti/saas-template
  'tsconfig.json',
]
for (const file of filesToPatch) {
  const filePath = join(dest, file)
  if (!existsSync(filePath)) continue
  const content = readFileSync(filePath, 'utf-8')
  const patched = content
    .replaceAll('saas-template', name)
    .replaceAll('@koeti/saas-template', `@koeti/${name}`)
  writeFileSync(filePath, patched)
}

// Write canonical lib/db/index.ts
writeFileSync(join(dest, 'lib', 'db', 'index.ts'), `import { baseSchema } from '@koeti/db'
import * as appSchema from './schema'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const client = postgres(process.env.POSTGRES_URL!)
export const db = drizzle(client, { schema: { ...baseSchema, ...appSchema } })
`)

// Write canonical lib/db/schema.ts
writeFileSync(join(dest, 'lib', 'db', 'schema.ts'), `// App-specific tables go here.
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.

export type {
  User, NewUser, Team, NewTeam, TeamMember, NewTeamMember,
  ActivityLog, NewActivityLog, Invitation, NewInvitation, TeamDataWithMembers,
} from '@koeti/db'
export { ActivityType } from '@koeti/db'
`)

// Write canonical drizzle.config.ts
writeFileSync(join(dest, 'drizzle.config.ts'), `import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: ['../../packages/db/src/schema.ts', './lib/db/schema.ts'],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL! },
})
`)

// Ensure migrations directory exists
mkdirSync(join(dest, 'lib', 'db', 'migrations'), { recursive: true })

// Write .env.local.example with all required env vars
writeFileSync(join(dest, '.env.local.example'), `POSTGRES_URL=${dbUrl}
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
BASE_URL=http://localhost:3000
AUTH_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
`)

// Write .env.local with POSTGRES_URL pre-filled
writeFileSync(join(dest, '.env.local'), `POSTGRES_URL=${dbUrl}
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
BASE_URL=http://localhost:3000
AUTH_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
`)

// Add DB to init.sql (for fresh docker compose up)
const initSqlPath = join(root, 'docker', 'postgres', 'init.sql')
appendFileSync(initSqlPath, `\n-- ${name}\nCREATE USER ${dbName} WITH PASSWORD 'localdev';\nCREATE DATABASE ${dbName} OWNER ${dbName};\n`)

// Provision on live postgres if already running
try {
  // ponytail: two -c flags — CREATE DATABASE can't run in a transaction (implicit when multiple stmts in one -c)
  execFileSync(
    'docker',
    ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'postgres',
      '-c', `CREATE USER ${dbName} WITH PASSWORD 'localdev';`,
      '-c', `CREATE DATABASE ${dbName} OWNER ${dbName};`],
    { cwd: root, stdio: 'pipe' }
  )
  console.log(`  ✅ Postgres: database '${dbName}' created live`)
} catch {
  console.log(`  ℹ️  Postgres offline — '${dbName}' will be created on next 'docker compose up'`)
}

console.log(`✅ Created apps/${name}/\n`)
console.log(`Next steps:`)
console.log(`  1. Fill in apps/${name}/.env.local (POSTGRES_URL already set)`)
console.log(`  2. Define your DB schema in lib/db/schema.ts`)
console.log(`  3. pnpm --filter @koeti/${name} db:migrate`)
console.log(`  4. pnpm --filter @koeti/${name} dev`)
console.log(`\nRead CLAUDE.md for patterns and conventions.\n`)
