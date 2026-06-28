## Verification Results

### pnpm install: PASS

### Package tsc checks:
- @koeti/config: PASS (added tsconfig.json + empty src/index.ts — package has no TS source, only JSON config files)
- @koeti/db: PASS
- @koeti/auth: PASS
- @koeti/billing: PASS
- @koeti/ui: PASS
- @koeti/email: PASS (after fix — see below)
- @koeti/analytics: PASS (after fix — see below)
- @koeti/saas-template: PASS

### create-mvp smoke test: PASS
- `apps/test-verify/` created with `package.json` (name `@koeti/test-verify`), `lib/db/index.ts`, `lib/db/schema.ts`, `drizzle.config.ts`, `.env.local.example`
- Deleted afterward

### pnpm build: PASS (env-var failures are the only errors)
- TypeScript compilation: ✓ Compiled successfully in 3.5s
- Fails at page-data collection due to missing `POSTGRES_URL` and Stripe API key — expected and acceptable

## Issues Found

1. **`@koeti/email` — missing `@types/node`**
   - File: `packages/email/src/client.ts:4`
   - Error: `Cannot find name 'process'. Do you need to install type definitions for node?`

2. **`@koeti/analytics` — missing `@types/node`**
   - Files: `packages/analytics/src/client.ts:9-10`, `packages/analytics/src/server.ts:3-4`
   - Error: `Cannot find name 'process'. Do you need to install type definitions for node?`

3. **`@koeti/config` — no tsconfig.json at package root**
   - Package contains only JSON config files (eslint, tailwind, tsconfig templates)
   - `tsc --noEmit` printed help and exited 1 because no tsconfig.json was found

4. **`apps/saas-template/middleware.ts` — dynamic `config` export rejected by Turbopack**
   - File: `apps/saas-template/middleware.ts:8`
   - Error: `Next.js can't recognize the exported 'config' field in route. It needs to be a static object.`
   - Root cause: `config` was re-exported from `createAuthMiddleware()` return value; `runtime: 'nodejs' as const` also tripped Turbopack's static-analysis parser

## Fixes Applied

1. **`packages/email/package.json`** — added `"@types/node": "^20.0.0"` to devDependencies

2. **`packages/analytics/package.json`** — added `"@types/node": "^20.0.0"` to devDependencies

3. **`packages/config/tsconfig.json`** — created with `"include": ["src/**/*"]` pointing at a minimal `src/index.ts` (`export {}`) so `tsc --noEmit` has a file to check

4. **`packages/config/src/index.ts`** — created as empty stub (`export {}`)

5. **`apps/saas-template/middleware.ts`** — inlined `config` as a static literal object (matcher + `runtime: 'nodejs'` without `as const`) so Turbopack can statically analyze it. The middleware function itself is still delegated to `createAuthMiddleware`.
