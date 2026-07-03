#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { randomBytes } from 'crypto'

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

// Copy template, excluding build artifacts, migrations, and local env
cpSync(src, dest, {
  recursive: true,
  filter: (src) => {
    const normalized = src.replace(/\\/g, '/')
    return !normalized.includes('node_modules') &&
           !normalized.includes('.next') &&
           !normalized.includes('.turbo') &&
           !normalized.includes('tsconfig.tsbuildinfo') &&
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
  '.env.example',    // POSTGRES_URL embeds the template db name
  'proxy.ts',        // createAuthMiddleware comment may reference saas-template
  'next.config.ts',  // transpilePackages may reference @koeti/saas-template
  'tsconfig.json',
]
for (const file of filesToPatch) {
  const filePath = join(dest, file)
  if (!existsSync(filePath)) continue
  const content = readFileSync(filePath, 'utf-8')
  const patched = content
    .replaceAll('saas-template', name)
    .replaceAll('saas_template', dbName)
  writeFileSync(filePath, patched)
}

// App identity lives in one file — swap the placeholder name for the real one
const sitePath = join(dest, 'lib', 'site.ts')
const displayName = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
writeFileSync(sitePath, readFileSync(sitePath, 'utf-8').replaceAll("'ACME'", `'${displayName}'`))

// Ensure migrations directory exists (excluded from copy above)
mkdirSync(join(dest, 'lib', 'db', 'migrations'), { recursive: true })

// Write .env.local with POSTGRES_URL and AUTH_SECRET pre-filled
writeFileSync(join(dest, '.env.local'), `POSTGRES_URL=${dbUrl}
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
BASE_URL=http://localhost:3000
AUTH_SECRET=${randomBytes(32).toString('hex')}
RESEND_API_KEY=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
`)

// Add DB to init.sql (for fresh docker compose up)
const initSqlPath = join(root, 'docker', 'postgres', 'init.sql')
appendFileSync(initSqlPath, `\n-- ${name}\nCREATE USER ${dbName} WITH PASSWORD 'localdev';\nCREATE DATABASE ${dbName} OWNER ${dbName};\n`)

// Provision on live postgres if reachable (docker compose locally, service container in CI)
await provisionDatabase(dbName)

async function provisionDatabase(dbName) {
  const adminUrl =
    process.env.POSTGRES_ADMIN_URL ?? 'postgresql://postgres:localdev@localhost:5432/postgres'
  let sql
  try {
    const { default: postgres } = await import('postgres')
    sql = postgres(adminUrl, { connect_timeout: 3, onnotice: () => {} })
    // ignore "already exists" (42710 user, 42P04 database) so re-runs are safe
    for (const stmt of [
      `CREATE USER ${dbName} WITH PASSWORD 'localdev'`,
      `CREATE DATABASE ${dbName} OWNER ${dbName}`,
    ]) {
      try {
        await sql.unsafe(stmt)
      } catch (err) {
        if (err.code !== '42710' && err.code !== '42P04') throw err
      }
    }
    console.log(`  ✅ Postgres: database '${dbName}' created live`)
  } catch {
    console.log(`  ℹ️  Postgres offline — '${dbName}' will be created on next 'docker compose up'`)
  } finally {
    await sql?.end()
  }
}

// Link the new workspace so db:migrate / dev work immediately.
// --no-frozen-lockfile: a scaffold adds a lockfile importer by definition,
// and CI environments default to frozen.
console.log(`  📦 Installing workspace dependencies...`)
execFileSync('pnpm', ['install', '--no-frozen-lockfile'], { cwd: root, stdio: 'inherit' })

console.log(`✅ Created apps/${name}/\n`)
console.log(`Next steps:`)
console.log(`  1. Fill in apps/${name}/.env.local (POSTGRES_URL and AUTH_SECRET already set)`)
console.log(`  2. Define your DB schema in lib/db/schema.ts`)
console.log(`  3. pnpm --filter @koeti/${name} db:migrate`)
console.log(`  4. pnpm --filter @koeti/${name} dev`)
console.log(`\nRead CLAUDE.md for patterns and conventions.\n`)
