#!/usr/bin/env node

// Full factory smoke loop: scaffold → migrate → build → serve.
// Factory smoke test: proves the full loop works end-to-end.
// scaffold → generate → verify-app (build → migrate → seed → serve → GET every
// page, public + authenticated) → cleanup. Renders the generated dashboard with
// a real session, so an SSR crash in a scaffolded page fails the loop.
//
// Requires a reachable Postgres superuser (docker compose up -d locally,
// or a service container in CI). Override with POSTGRES_ADMIN_URL.

import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = 'smoke-check';
const dbName = 'smoke_check';
const dest = join(root, 'apps', name);
const initSqlPath = join(root, 'docker', 'postgres', 'init.sql');

if (existsSync(dest)) {
  console.error(`apps/${name} already exists — remove it before running the smoke test`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const step = (msg) => console.log(`\n🔎 ${msg}`);

const initSqlSnapshot = readFileSync(initSqlPath, 'utf-8');
let failed = false;

try {
  step('Scaffolding');
  run(`node scripts/create-mvp.mjs ${name}`);

  step('Generating migrations');
  run(`pnpm --filter @koeti/${name} db:generate`);

  // Delegate to verify-app: it builds, migrates, seeds, serves, and GETs EVERY
  // page (public + authenticated with a real session). That proves the generated
  // dashboard — charts, KPIs, and all — actually renders, not just the 4 public
  // routes. An SSR crash in a scaffolded dashboard now fails the factory loop.
  step('Verifying every page of the generated app renders');
  run(`node scripts/verify-app.mjs ${name}`);

  console.log('\n✅ SMOKE PASSED — the factory loop works end-to-end\n');
} catch (err) {
  failed = true;
  console.error(`\n❌ SMOKE FAILED: ${err.message}\n`);
} finally {
  step('Cleaning up');
  rmSync(dest, { recursive: true, force: true });
  writeFileSync(initSqlPath, initSqlSnapshot);
  await dropDatabase();
  run('pnpm install --no-frozen-lockfile'); // prune the smoke app from the lockfile (CI defaults to frozen)
}
process.exit(failed ? 1 : 0);

async function dropDatabase() {
  const adminUrl =
    process.env.POSTGRES_ADMIN_URL ?? 'postgresql://postgres:localdev@localhost:5432/postgres';
  let sql;
  try {
    const { default: postgres } = await import('postgres');
    sql = postgres(adminUrl, { connect_timeout: 3, onnotice: () => {} });
    await sql.unsafe(`DROP DATABASE IF EXISTS ${dbName}`);
    await sql.unsafe(`DROP USER IF EXISTS ${dbName}`);
  } catch {
    console.warn(`  ⚠️  could not drop '${dbName}' — drop it manually if postgres was up`);
  } finally {
    await sql?.end();
  }
}
