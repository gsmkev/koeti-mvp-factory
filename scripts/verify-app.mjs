#!/usr/bin/env node

// Boot an app and render every page with a real session.
// Per-app runtime verification: proves the app the LLM just built actually renders.
// build → migrate → seed → serve → GET every page (public + authenticated).
//
// Public pages must return 200. Auth-gated pages must redirect anonymously,
// then return 200 with a valid session cookie — this executes each page's
// server component against a real DB and catches SSR crashes that
// typecheck/build cannot see.
//
// Usage: pnpm verify-app <name>

import { execSync, spawn } from 'child_process';
import { createHmac } from 'crypto';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { createServer } from 'net';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
// same charset create-mvp enforces — also keeps the execSync interpolations shell-safe
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || !existsSync(join(root, 'apps', name))) {
  console.error('Usage: pnpm verify-app <name>  (apps/<name> must exist)');
  process.exit(1);
}
const appDir = join(root, 'apps', name);

// ---- env ----
const env = Object.fromEntries(
  readFileSync(join(appDir, '.env.local'), 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
if (!env.AUTH_SECRET || !env.POSTGRES_URL) {
  console.error(`apps/${name}/.env.local must define AUTH_SECRET and POSTGRES_URL`);
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const step = (msg) => console.log(`\n🔎 ${msg}`);

// ---- route discovery: app/**/page.tsx → URL paths ----
function discoverRoutes(dir, segments = []) {
  const routes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('[') || entry.name.startsWith('_')) continue; // dynamic/private
      const next = entry.name.startsWith('(') ? segments : [...segments, entry.name];
      routes.push(...discoverRoutes(join(dir, entry.name), next));
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      routes.push('/' + segments.join('/'));
    }
  }
  return routes;
}

// ---- session cookie: HS256 JWT, same shape @koeti/auth signs ----
function mintSession(userId) {
  const b64u = (s) => Buffer.from(s).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64u(
    JSON.stringify({
      user: { id: userId },
      expires: new Date(Date.now() + 86_400_000).toISOString(),
      iat: now,
      exp: now + 86_400,
    }),
  );
  const sig = createHmac('sha256', env.AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const freePort = () =>
  new Promise((resolve) => {
    const srv = createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`server did not come up on ${url} within ${timeoutMs / 1000}s`);
}

let server;
let failed = false;
try {
  step(`Building @koeti/${name}`);
  run(`pnpm --filter @koeti/${name} build`);

  step('Migrating + seeding');
  run(`pnpm --filter @koeti/${name} db:migrate`);
  run(`pnpm --filter @koeti/${name} db:seed`);

  const { default: postgres } = await import('postgres');
  const sql = postgres(env.POSTGRES_URL, { connect_timeout: 5 });
  const [user] = await sql`select id from users where email = 'test@test.com'`;
  await sql.end();
  if (!user) throw new Error('seed did not create test@test.com');
  const cookie = `session=${mintSession(user.id)}`;

  const routes = discoverRoutes(join(appDir, 'app')).sort();
  if (routes.length === 0) throw new Error('no page.tsx routes found under app/');

  const port = await freePort();
  step(`Serving on :${port}`);
  server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port)], {
    cwd: appDir,
    stdio: 'pipe',
    detached: true,
  });
  await waitForServer(`http://localhost:${port}/`);

  step(`Checking ${routes.length} routes`);
  const failures = [];
  for (const route of routes) {
    const url = `http://localhost:${port}${route}`;
    const anon = await fetch(url, { redirect: 'manual' });
    if (anon.status === 200) {
      console.log(`  ✅ ${route} → 200 (public)`);
      continue;
    }
    if (anon.status >= 300 && anon.status < 400) {
      const authed = await fetch(url, { redirect: 'manual', headers: { cookie } });
      if (authed.status === 200) {
        console.log(`  ✅ ${route} → redirect anon, 200 authed`);
      } else {
        failures.push(`${route}: authenticated GET → ${authed.status} (expected 200)`);
        console.log(`  ❌ ${route} → ${authed.status} with session cookie`);
      }
      continue;
    }
    failures.push(`${route}: anonymous GET → ${anon.status} (expected 200 or redirect)`);
    console.log(`  ❌ ${route} → ${anon.status}`);
  }

  if (failures.length > 0)
    throw new Error(`${failures.length} route(s) failed:\n  ${failures.join('\n  ')}`);
  console.log(`\n✅ VERIFY PASSED — all ${routes.length} pages of @koeti/${name} render\n`);
} catch (err) {
  failed = true;
  console.error(`\n❌ VERIFY FAILED: ${err.message}\n`);
} finally {
  if (server) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {}
  }
}
process.exit(failed ? 1 : 0);
