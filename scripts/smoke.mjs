#!/usr/bin/env node
// Factory smoke test: proves the full loop works end-to-end.
// scaffold → install → generate → migrate → build → serve → HTTP 200 → cleanup
//
// Requires a reachable Postgres superuser (docker compose up -d locally,
// or a service container in CI). Override with POSTGRES_ADMIN_URL.

import { execSync, spawn } from 'child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const name = 'smoke-check'
const dbName = 'smoke_check'
const dest = join(root, 'apps', name)
const port = 3199
const initSqlPath = join(root, 'docker', 'postgres', 'init.sql')

if (existsSync(dest)) {
  console.error(`apps/${name} already exists — remove it before running the smoke test`)
  process.exit(1)
}

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' })
const step = (msg) => console.log(`\n🔎 ${msg}`)

const initSqlSnapshot = readFileSync(initSqlPath, 'utf-8')
let server
let failed = false

try {
  step('Scaffolding')
  run(`node scripts/create-mvp.mjs ${name}`)

  step('Generating + applying migrations')
  run(`pnpm --filter @koeti/${name} db:generate`)
  run(`pnpm --filter @koeti/${name} db:migrate`)

  step('Building')
  run(`pnpm --filter @koeti/${name} build`)

  step(`Serving on :${port}`)
  server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port)], {
    cwd: dest,
    stdio: 'pipe',
    detached: true,
  })
  await waitForServer(`http://localhost:${port}/`)

  for (const path of ['/', '/pricing', '/sign-up', '/sign-in']) {
    const res = await fetch(`http://localhost:${port}${path}`)
    if (res.status !== 200) throw new Error(`GET ${path} → ${res.status} (expected 200)`)
    console.log(`  ✅ ${path} → 200`)
  }

  console.log('\n✅ SMOKE PASSED — the factory loop works end-to-end\n')
} catch (err) {
  failed = true
  console.error(`\n❌ SMOKE FAILED: ${err.message}\n`)
} finally {
  if (server) {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {}
  }
  step('Cleaning up')
  rmSync(dest, { recursive: true, force: true })
  writeFileSync(initSqlPath, initSqlSnapshot)
  await dropDatabase()
  run('pnpm install --no-frozen-lockfile') // prune the smoke app from the lockfile (CI defaults to frozen)
}
process.exit(failed ? 1 : 0)

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 500))
    }
  }
  throw new Error(`server did not come up on ${url} within ${timeoutMs / 1000}s`)
}

async function dropDatabase() {
  const adminUrl =
    process.env.POSTGRES_ADMIN_URL ?? 'postgresql://postgres:localdev@localhost:5432/postgres'
  let sql
  try {
    const { default: postgres } = await import('postgres')
    sql = postgres(adminUrl, { connect_timeout: 3, onnotice: () => {} })
    await sql.unsafe(`DROP DATABASE IF EXISTS ${dbName}`)
    await sql.unsafe(`DROP USER IF EXISTS ${dbName}`)
  } catch {
    console.warn(`  ⚠️  could not drop '${dbName}' — drop it manually if postgres was up`)
  } finally {
    await sql?.end()
  }
}
