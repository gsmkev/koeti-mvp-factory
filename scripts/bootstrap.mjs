#!/usr/bin/env node

// Fresh-clone setup: write .env files and provision local Postgres.
// Makes a fresh clone or git worktree runnable in one command:
// - .env.local for every app that lacks one (from its .env.example, AUTH_SECRET generated)
// - local Postgres via docker compose (skipped if docker is unavailable)
//
// Safe to re-run: never overwrites an existing .env.local.

import { execFileSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { randomBytes } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appsDir = join(root, 'apps');

for (const app of readdirSync(appsDir)) {
  const example = join(appsDir, app, '.env.example');
  const local = join(appsDir, app, '.env.local');
  if (!existsSync(example)) continue;
  if (existsSync(local)) {
    console.log(`  ✓ apps/${app}/.env.local already exists`);
    continue;
  }
  const env = readFileSync(example, 'utf-8').replace(
    /^AUTH_SECRET=$/m,
    `AUTH_SECRET=${randomBytes(32).toString('hex')}`,
  );
  writeFileSync(local, env);
  console.log(`  ✅ apps/${app}/.env.local created (AUTH_SECRET generated)`);
}

try {
  execFileSync('docker', ['compose', 'up', '-d'], { cwd: root, stdio: 'inherit' });
  console.log('  ✅ Postgres running (docker compose)');
} catch {
  console.log('  ⚠️  docker unavailable — start Postgres yourself, apps expect localhost:5432');
}

console.log('\nDone. Next: pnpm install && pnpm dev (or pnpm create-mvp <name>)\n');
