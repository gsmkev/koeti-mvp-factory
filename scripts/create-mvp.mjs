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

// Link the new workspace so db:migrate / dev work immediately
console.log(`  📦 Installing workspace dependencies...`)
execFileSync('pnpm', ['install'], { cwd: root, stdio: 'inherit' })

console.log(`✅ Created apps/${name}/\n`)
console.log(`Next steps:`)
console.log(`  1. Fill in apps/${name}/.env.local (POSTGRES_URL and AUTH_SECRET already set)`)
console.log(`  2. Define your DB schema in lib/db/schema.ts`)
console.log(`  3. pnpm --filter @koeti/${name} db:migrate`)
console.log(`  4. pnpm --filter @koeti/${name} dev`)
console.log(`\nRead CLAUDE.md for patterns and conventions.\n`)
