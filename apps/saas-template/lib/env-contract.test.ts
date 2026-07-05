// Tests for env contract.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Guards the contract between code and configuration: every env var this app's
// code reads must be documented in .env.example, and the base set the shared
// @koeti/* packages depend on must always be present. Fails the moment someone
// adds a process.env.FOO without documenting it.

const appRoot = join(__dirname, '..');

const REQUIRED_IN_ENV_EXAMPLE = [
  'POSTGRES_URL',
  'AUTH_SECRET',
  'BASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

// Set by the platform/runtime, not by .env files
const RUNTIME_PROVIDED = new Set(['NODE_ENV', 'CI', 'VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'PORT']);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'migrations' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function envVarsReadBy(files: string[]): Set<string> {
  const vars = new Set<string>();
  for (const file of files) {
    for (const match of readFileSync(file, 'utf-8').matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      vars.add(match[1]);
    }
  }
  return vars;
}

describe('env contract', () => {
  const exampleKeys = new Set(
    readFileSync(join(appRoot, '.env.example'), 'utf-8')
      .split('\n')
      .map((line) => line.split('=')[0].trim())
      .filter(Boolean),
  );

  it('.env.example documents the base vars the @koeti/* packages need', () => {
    for (const key of REQUIRED_IN_ENV_EXAMPLE) {
      expect(exampleKeys, `${key} missing from .env.example`).toContain(key);
    }
  });

  it('every env var read by app code is documented in .env.example', () => {
    const files = [
      ...sourceFiles(join(appRoot, 'app')),
      ...sourceFiles(join(appRoot, 'lib')),
      join(appRoot, 'proxy.ts'),
      join(appRoot, 'next.config.ts'),
      join(appRoot, 'drizzle.config.ts'),
    ];
    const undocumented = [...envVarsReadBy(files)].filter(
      (v) => !exampleKeys.has(v) && !RUNTIME_PROVIDED.has(v),
    );
    expect(undocumented, `add these to .env.example: ${undocumented.join(', ')}`).toEqual([]);
  });
});
