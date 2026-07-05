#!/usr/bin/env node

// Headless-Chromium E2E: sign-up + CRUD through the ResourcePanel forms.
// Per-app E2E: drives the real UI in headless Chromium.
// build → migrate → serve → sign up a fresh user → visit every dashboard page
// → on every ResourcePanel page: create a record through the form, see it in
// the table, delete it, see it gone.
//
// Works for ANY app built from the template: the flows are located by the
// data-slot attributes ResourcePanel emits, not by app-specific selectors.
//
// Usage: pnpm e2e-app <name>

import { execSync, spawn } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { createServer } from 'net';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
// same charset create-mvp enforces — also keeps the execSync interpolations shell-safe
if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || !existsSync(join(root, 'apps', name))) {
  console.error('Usage: pnpm e2e-app <name>  (apps/<name> must exist)');
  process.exit(1);
}
const appDir = join(root, 'apps', name);

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const step = (msg) => console.log(`\n🎭 ${msg}`);

// route discovery — same convention as verify-app.mjs
function discoverRoutes(dir, segments = []) {
  const routes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('[') || entry.name.startsWith('_')) continue;
      const next = entry.name.startsWith('(') ? segments : [...segments, entry.name];
      routes.push(...discoverRoutes(join(dir, entry.name), next));
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      routes.push('/' + segments.join('/'));
    }
  }
  return routes;
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

async function fillCreateForm(form, marker) {
  for (const control of await form.locator('input[name], textarea[name], select[name]').all()) {
    const tag = await control.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'select') {
      await control.selectOption({ index: 0 });
      continue;
    }
    const type = (await control.getAttribute('type')) ?? 'text';
    if (type === 'hidden') continue;
    if (type === 'number') await control.fill('42');
    else if (type === 'date') await control.fill(new Date().toISOString().slice(0, 10));
    else if (type === 'email') await control.fill(`${marker}@test.com`);
    else await control.fill(marker); // text / textarea
  }
}

let server;
let browser;
let failed = false;
try {
  step(`Building @koeti/${name}`);
  run(`pnpm --filter @koeti/${name} build`);
  step('Migrating');
  run(`pnpm --filter @koeti/${name} db:migrate`);

  const port = await freePort();
  const base = `http://localhost:${port}`;
  step(`Serving on :${port}`);
  server = spawn('pnpm', ['exec', 'next', 'start', '-p', String(port)], {
    cwd: appDir,
    stdio: 'pipe',
    detached: true,
  });
  await waitForServer(base);

  browser = await chromium.launch();
  const page = await browser.newPage();
  page.setDefaultTimeout(15_000);

  step('Sign-up flow (fresh user)');
  const stamp = Date.now();
  await page.goto(`${base}/sign-up`);
  await page.fill('input[name="email"]', `e2e-${stamp}@test.com`);
  await page.fill('input[name="password"]', 'e2e-password-123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30_000 });
  console.log(`  ✅ signed up e2e-${stamp}@test.com → /dashboard`);

  step('Platform endpoints (uploads + notifications)');
  // page.request shares the session cookie with the browser context
  const upload = await page.request.post(`${base}/api/files`, {
    multipart: {
      file: { name: 'e2e.txt', mimeType: 'text/plain', buffer: Buffer.from(`e2e ${stamp}`) },
    },
  });
  if (upload.status() !== 201) throw new Error(`/api/files upload: HTTP ${upload.status()}`);
  const stored = await upload.json();
  const fileUrl = stored.url.startsWith('http') ? stored.url : `${base}${stored.url}`;
  const served = await page.request.get(fileUrl);
  if (served.status() !== 200 || (await served.text()) !== `e2e ${stamp}`) {
    throw new Error(`serving uploaded file: HTTP ${served.status()}`);
  }
  console.log(`  ✅ /api/files upload → 201, served back from ${stored.url}`);

  const notif = await page.request.get(`${base}/api/notifications`);
  const notifBody = notif.status() === 200 ? await notif.json() : {};
  if (!Array.isArray(notifBody.items) || typeof notifBody.unread !== 'number') {
    throw new Error(`/api/notifications: HTTP ${notif.status()}`);
  }
  const bell = page.locator('button:has(.lucide-bell)').first();
  if (!(await bell.isVisible())) throw new Error('notifications bell not visible in AppShell');
  console.log(`  ✅ /api/notifications → 200 (${notifBody.unread} unread), bell visible`);

  // GDPR export — sign-up made this user the team owner, so it must succeed
  const exportRes = await page.request.get(`${base}/api/team/export`);
  const exportBody = exportRes.status() === 200 ? await exportRes.json() : {};
  if (!Array.isArray(exportBody.team)) {
    throw new Error(`/api/team/export: HTTP ${exportRes.status()}`);
  }
  console.log(`  ✅ /api/team/export → 200 (${Object.keys(exportBody).length} tables in the dump)`);

  const dashRoutes = discoverRoutes(join(appDir, 'app'))
    .filter((r) => r.startsWith('/dashboard'))
    .sort();

  step(`Driving ${dashRoutes.length} dashboard pages`);
  for (const route of dashRoutes) {
    const res = await page.goto(`${base}${route}`);
    if (!res || res.status() !== 200) throw new Error(`${route}: HTTP ${res?.status()}`);

    const form = page.locator('[data-slot="resource-create-form"]');
    if ((await form.count()) === 0) {
      console.log(`  ✅ ${route} renders (no resource panel)`);
      continue;
    }

    // create through the real form
    const marker = `E2E-${stamp}`;
    await fillCreateForm(form, marker);
    await form.locator('button[type="submit"]').click();
    let row = page.locator('tbody tr', { hasText: marker });
    await row.waitFor();
    console.log(`  ✅ ${route} create → row visible`);

    // edit through the dialog when the panel exposes it
    if ((await row.locator('[data-slot="resource-edit-trigger"]').count()) > 0) {
      await row.locator('[data-slot="resource-edit-trigger"]').click();
      const editForm = page.locator('[data-slot="resource-edit-form"]');
      const textField = editForm.locator('input[type="text"], textarea').first();
      const edited = `${marker}-EDITED`;
      await textField.fill(edited);
      await editForm.locator('button[type="submit"]').click();
      row = page.locator('tbody tr', { hasText: edited });
      await row.waitFor();
      console.log(`  ✅ ${route} edit → row updated`);
    }

    // delete the row we just created
    if ((await row.locator('[data-slot="resource-delete-form"] button').count()) > 0) {
      await row.locator('[data-slot="resource-delete-form"] button').click();
      await row.waitFor({ state: 'detached' });
      console.log(`  ✅ ${route} delete → row gone`);
    }
  }

  console.log(
    `\n✅ E2E PASSED — @koeti/${name}: sign-up + ${dashRoutes.length} pages driven in a real browser\n`,
  );
} catch (err) {
  failed = true;
  console.error(`\n❌ E2E FAILED: ${err.message}\n`);
} finally {
  await browser?.close();
  if (server) {
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch {}
  }
}
process.exit(failed ? 1 : 0);
