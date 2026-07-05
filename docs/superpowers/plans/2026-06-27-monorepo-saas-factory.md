# koeti-mvp-factory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `apps/saas-template` (already cloned from nextjs/saas-starter) into a fully-wired Turborepo monorepo with 7 shared `@koeti/*` packages, a `create-mvp` generator, and `saas-template` consuming all packages.

**Architecture:** Root Turborepo + pnpm workspaces. Infrastructure extracted from `saas-template` into packages. `saas-template` updated to import from `@koeti/*`. `create-mvp.mjs` copies `saas-template` and renames. AGENTS.md and knowledge graph tooling already in place.

**Tech Stack:** Next.js 15, TypeScript, pnpm workspaces, Turborepo, Drizzle ORM + postgres.js, Stripe, shadcn/ui, Tailwind CSS v4, React Email, Resend, PostHog, jose, bcryptjs, zod

---

## File Map

```
# Created in this plan
package.json                              ← root workspace
pnpm-workspace.yaml
turbo.json
.npmrc
.gitignore (update)

packages/config/
  package.json
  tsconfig/base.json
  tsconfig/nextjs.json
  eslint/index.js
  tailwind/preset.js

packages/db/
  package.json
  tsconfig.json
  src/schema.ts                           ← copied from saas-template, export baseSchema
  src/index.ts

packages/auth/
  package.json
  tsconfig.json
  src/session.ts                          ← copied from saas-template/lib/auth/session.ts
  src/middleware.ts                       ← copied from saas-template/lib/auth/middleware.ts (no DB deps)
  src/create-middleware.ts               ← createAuthMiddleware factory
  src/index.ts

packages/billing/
  package.json
  tsconfig.json
  src/stripe.ts                           ← adapted from saas-template/lib/payments/stripe.ts
  src/index.ts

packages/ui/
  package.json
  tsconfig.json
  src/components/                         ← copied from saas-template/components/ui/
  src/utils.ts                            ← cn() utility
  src/index.ts

packages/email/
  package.json
  tsconfig.json
  src/client.ts
  src/templates/welcome.tsx
  src/templates/password-reset.tsx
  src/index.ts

packages/analytics/
  package.json
  tsconfig.json
  src/server.ts
  src/client.ts
  src/index.ts

# Modified in this plan
apps/saas-template/package.json           ← name: @koeti/saas-template, deps → workspace:*
apps/saas-template/lib/db/drizzle.ts     ← use @koeti/db baseSchema
apps/saas-template/lib/db/queries.ts     ← fix imports (@koeti/auth for session)
apps/saas-template/lib/auth/session.ts   ← replace with re-export from @koeti/auth
apps/saas-template/lib/auth/middleware.ts← fix getUser/getTeamForUser imports
apps/saas-template/lib/payments/stripe.ts← use @koeti/billing + DI for queries
apps/saas-template/components/ui/*       ← replace with imports from @koeti/ui
apps/saas-template/middleware.ts         ← use createAuthMiddleware from @koeti/auth
apps/saas-template/tsconfig.json         ← extend @koeti/config/tsconfig/nextjs

# New files
scripts/create-mvp.mjs
```

---

## Task 1: Root monorepo scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.npmrc`
- Modify: `.gitignore`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "koeti-mvp-factory",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "create-mvp": "node scripts/create-mvp.mjs"
  },
  "devDependencies": {
    "turbo": "^2.5.4",
    "typescript": "^5.8.3"
  },
  "packageManager": "pnpm@10.0.0"
}
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Create `.npmrc`**

```
auto-install-peers=true
shamefully-hoist=false
```

- [ ] **Step 5: Update `.gitignore`**

Append to existing `.gitignore` (create if missing):

```
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
*.tsbuildinfo

# Env
.env
.env.local
.env*.local

# Turbo
.turbo/

# Knowledge graphs (auto-generated)
graphify-out/
.code-review-graph/
```

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json .npmrc .gitignore
git commit -m "feat: root monorepo scaffold (Turborepo + pnpm workspaces)"
```

---

## Task 2: @koeti/config package

**Files:**

- Create: `packages/config/package.json`
- Create: `packages/config/tsconfig/base.json`
- Create: `packages/config/tsconfig/nextjs.json`
- Create: `packages/config/eslint/index.js`
- Create: `packages/config/tailwind/preset.js`

- [ ] **Step 1: Create `packages/config/package.json`**

```json
{
  "name": "@koeti/config",
  "version": "0.1.0",
  "private": true,
  "exports": {
    "./tsconfig/base": "./tsconfig/base.json",
    "./tsconfig/nextjs": "./tsconfig/nextjs.json",
    "./eslint": "./eslint/index.js",
    "./tailwind/preset": "./tailwind/preset.js"
  }
}
```

- [ ] **Step 2: Create `packages/config/tsconfig/base.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `packages/config/tsconfig/nextjs.json`**

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "noEmit": true,
    "incremental": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `packages/config/eslint/index.js`**

```js
/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': ['warn', { allow: ['error'] }],
    },
  },
];
```

- [ ] **Step 5: Create `packages/config/tailwind/preset.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add packages/config
git commit -m "feat: add @koeti/config (tsconfig, eslint, tailwind preset)"
```

---

## Task 3: @koeti/db package

**Files:**

- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/index.ts`

- [ ] **Step 1: Create `packages/db/package.json`**

```json
{
  "name": "@koeti/db",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.43.1",
    "postgres": "^3.4.5"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/db/src/schema.ts`**

Copy the full content of `apps/saas-template/lib/db/schema.ts` verbatim. No changes needed.

- [ ] **Step 4: Create `packages/db/src/index.ts`**

```ts
export * from './schema';

// Grouped export for spreading into app drizzle instances
import * as schema from './schema';
export const baseSchema = schema;
```

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat: add @koeti/db (base schema + baseSchema export)"
```

---

## Task 4: @koeti/auth package

**Files:**

- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/session.ts`
- Create: `packages/auth/src/middleware.ts`
- Create: `packages/auth/src/create-middleware.ts`
- Create: `packages/auth/src/index.ts`

- [ ] **Step 1: Create `packages/auth/package.json`**

```json
{
  "name": "@koeti/auth",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "jose": "^6.0.11",
    "zod": "^3.24.4"
  },
  "peerDependencies": {
    "@koeti/db": "workspace:*",
    "next": ">=15.0.0"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `packages/auth/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/auth/src/session.ts`**

Copy `apps/saas-template/lib/auth/session.ts` verbatim, removing the `import { NewUser } from '@/lib/db/schema'` and replacing it with:

```ts
import { compare, hash } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);
const SALT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return hash(password, SALT_ROUNDS);
}

export async function comparePasswords(plain: string, hashed: string) {
  return compare(plain, hashed);
}

type SessionData = {
  user: { id: number };
  expires: string;
};

export async function signToken(payload: SessionData) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key);
}

export async function verifyToken(input: string) {
  const { payload } = await jwtVerify(input, key, { algorithms: ['HS256'] });
  return payload as SessionData;
}

export async function getSession() {
  const session = (await cookies()).get('session')?.value;
  if (!session) return null;
  return await verifyToken(session);
}

export async function setSession(user: { id: number }) {
  const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session: SessionData = {
    user: { id: user.id },
    expires: expiresInOneDay.toISOString(),
  };
  const encryptedSession = await signToken(session);
  (await cookies()).set('session', encryptedSession, {
    expires: expiresInOneDay,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
}
```

- [ ] **Step 4: Create `packages/auth/src/middleware.ts`**

This exports `validatedAction` (no DB) and `ActionState`. `validatedActionWithUser` and `withTeam` stay per-app because they need `getUser`/`getTeamForUser` from the app's DB instance.

```ts
import { z } from 'zod';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any;
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
) => Promise<T>;

export function validatedAction<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>,
) {
  return async (prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }
    return action(result.data, formData);
  };
}
```

- [ ] **Step 5: Create `packages/auth/src/create-middleware.ts`**

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { signToken, verifyToken } from './session';

export function createAuthMiddleware(config: { protectedRoutes: string[] }) {
  const protectedPrefixes = config.protectedRoutes;

  async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionCookie = request.cookies.get('session');
    const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

    if (isProtected && !sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    let res = NextResponse.next();

    if (sessionCookie && request.method === 'GET') {
      try {
        const parsed = await verifyToken(sessionCookie.value);
        const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
        res.cookies.set({
          name: 'session',
          value: await signToken({ ...parsed, expires: expiresInOneDay.toISOString() }),
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          expires: expiresInOneDay,
        });
      } catch {
        res.cookies.delete('session');
        if (isProtected) {
          return NextResponse.redirect(new URL('/sign-in', request.url));
        }
      }
    }

    return res;
  }

  const config_ = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
    runtime: 'nodejs' as const,
  };

  return { middleware, config: config_ };
}
```

- [ ] **Step 6: Create `packages/auth/src/index.ts`**

```ts
export {
  hashPassword,
  comparePasswords,
  signToken,
  verifyToken,
  getSession,
  setSession,
} from './session';
export { validatedAction } from './middleware';
export type { ActionState } from './middleware';
export { createAuthMiddleware } from './create-middleware';
```

- [ ] **Step 7: Commit**

```bash
git add packages/auth
git commit -m "feat: add @koeti/auth (session, validatedAction, createAuthMiddleware)"
```

---

## Task 5: @koeti/billing package

**Files:**

- Create: `packages/billing/package.json`
- Create: `packages/billing/tsconfig.json`
- Create: `packages/billing/src/stripe.ts`
- Create: `packages/billing/src/index.ts`

- [ ] **Step 1: Create `packages/billing/package.json`**

```json
{
  "name": "@koeti/billing",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "stripe": "^18.1.0"
  },
  "peerDependencies": {
    "@koeti/db": "workspace:*",
    "next": ">=15.0.0"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `packages/billing/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/base",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/billing/src/stripe.ts`**

Adapted from `apps/saas-template/lib/payments/stripe.ts`. Key change: `handleSubscriptionChange` accepts DB functions via dependency injection instead of importing from the app.

```ts
import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import type { Team } from '@koeti/db';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function createCheckoutSession({
  team,
  priceId,
  getUser,
}: {
  team: Team | null;
  priceId: string;
  getUser: () => Promise<{ id: number } | null>;
}) {
  const user = await getUser();
  if (!team || !user) {
    redirect(`/sign-up?redirect=checkout&priceId=${priceId}`);
  }
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.BASE_URL}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BASE_URL}/pricing`,
    customer: team.stripeCustomerId || undefined,
    client_reference_id: String(user.id),
    allow_promotion_codes: true,
    subscription_data: { trial_period_days: 14 },
  });
  redirect(session.url!);
}

export async function createCustomerPortalSession(team: Team) {
  if (!team.stripeCustomerId || !team.stripeProductId) {
    redirect('/pricing');
  }
  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();
  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(team.stripeProductId);
    if (!product.active) throw new Error("Team's product is not active in Stripe");
    const prices = await stripe.prices.list({ product: product.id, active: true });
    if (prices.data.length === 0) throw new Error('No active prices found');
    configuration = await stripe.billingPortal.configurations.create({
      business_profile: { headline: 'Manage your subscription' },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'create_prorations',
          products: [{ product: product.id, prices: prices.data.map((p) => p.id) }],
        },
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
          cancellation_reason: {
            enabled: true,
            options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
          },
        },
        payment_method_update: { enabled: true },
      },
    });
  }
  return stripe.billingPortal.sessions.create({
    customer: team.stripeCustomerId,
    return_url: `${process.env.BASE_URL}/dashboard`,
    configuration: configuration.id,
  });
}

type BillingDeps = {
  getTeamByStripeCustomerId: (customerId: string) => Promise<Team | null>;
  updateTeamSubscription: (
    teamId: number,
    data: {
      stripeSubscriptionId: string | null;
      stripeProductId: string | null;
      planName: string | null;
      subscriptionStatus: string;
    },
  ) => Promise<void>;
};

export async function handleSubscriptionChange(
  subscription: Stripe.Subscription,
  deps: BillingDeps,
) {
  const customerId = subscription.customer as string;
  const team = await deps.getTeamByStripeCustomerId(customerId);
  if (!team) {
    console.error('Team not found for Stripe customer:', customerId);
    return;
  }
  const status = subscription.status;
  if (status === 'active' || status === 'trialing') {
    const plan = subscription.items.data[0]?.plan;
    await deps.updateTeamSubscription(team.id, {
      stripeSubscriptionId: subscription.id,
      stripeProductId: plan?.product as string,
      planName: (plan?.product as Stripe.Product).name,
      subscriptionStatus: status,
    });
  } else if (status === 'canceled' || status === 'unpaid') {
    await deps.updateTeamSubscription(team.id, {
      stripeSubscriptionId: null,
      stripeProductId: null,
      planName: null,
      subscriptionStatus: status,
    });
  }
}

export async function getStripePrices() {
  const prices = await stripe.prices.list({
    expand: ['data.product'],
    active: true,
    type: 'recurring',
  });
  return prices.data.map((price) => ({
    id: price.id,
    productId: typeof price.product === 'string' ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }));
}

export async function getStripeProducts() {
  const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });
  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === 'string' ? product.default_price : product.default_price?.id,
  }));
}
```

- [ ] **Step 4: Create `packages/billing/src/index.ts`**

```ts
export {
  stripe,
  createCheckoutSession,
  createCustomerPortalSession,
  handleSubscriptionChange,
  getStripePrices,
  getStripeProducts,
} from './stripe';
```

- [ ] **Step 5: Commit**

```bash
git add packages/billing
git commit -m "feat: add @koeti/billing (Stripe checkout, portal, webhook handler with DI)"
```

---

## Task 6: @koeti/ui package

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/utils.ts`
- Create: `packages/ui/src/components/` (copy from saas-template)
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@koeti/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.511.0",
    "radix-ui": "^1.4.2",
    "tailwind-merge": "^3.3.0",
    "tw-animate-css": "^1.3.0"
  },
  "peerDependencies": {
    "react": ">=19.0.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/base",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/ui/src/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Copy shadcn components from saas-template**

```bash
cp -r apps/saas-template/components/ui/* packages/ui/src/components/
```

In each copied component file, replace the local `@/lib/utils` import with the package path:

```bash
# Replace the import in all component files
sed -i 's|from "@/lib/utils"|from "../utils"|g' packages/ui/src/components/*.tsx
sed -i "s|from '@/lib/utils'|from '../utils'|g" packages/ui/src/components/*.tsx
```

- [ ] **Step 5: Create `packages/ui/src/index.ts`**

```ts
export { cn } from './utils';
export { Avatar, AvatarFallback, AvatarImage } from './components/avatar';
export { Button, buttonVariants } from './components/button';
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/card';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/dropdown-menu';
export { Input } from './components/input';
export { Label } from './components/label';
export { RadioGroup, RadioGroupItem } from './components/radio-group';
```

- [ ] **Step 6: Commit**

```bash
git add packages/ui
git commit -m "feat: add @koeti/ui (shadcn components + cn utility)"
```

---

## Task 7: @koeti/email package

**Files:**

- Create: `packages/email/package.json`
- Create: `packages/email/tsconfig.json`
- Create: `packages/email/src/client.ts`
- Create: `packages/email/src/templates/welcome.tsx`
- Create: `packages/email/src/templates/password-reset.tsx`
- Create: `packages/email/src/index.ts`

- [ ] **Step 1: Create `packages/email/package.json`**

```json
{
  "name": "@koeti/email",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@react-email/components": "^0.0.34",
    "react-email": "^4.0.16",
    "resend": "^4.5.2"
  },
  "peerDependencies": {
    "react": ">=19.0.0"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `packages/email/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/base",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "react-jsx",
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/email/src/client.ts`**

```ts
import { Resend } from 'resend';
import type { ReactElement } from 'react';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  template,
  from = 'noreply@koeti.io',
}: {
  to: string;
  subject: string;
  template: ReactElement;
  from?: string;
}) {
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react: template,
  });
  if (error) throw new Error(`Failed to send email: ${error.message}`);
}
```

- [ ] **Step 4: Create `packages/email/src/templates/welcome.tsx`**

```tsx
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';

interface WelcomeEmailProps {
  name: string | null;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the platform</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>Welcome{name ? `, ${name}` : ''}!</Heading>
          <Text>Your account has been created. You can now sign in and get started.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 5: Create `packages/email/src/templates/password-reset.tsx`**

```tsx
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';

interface PasswordResetEmailProps {
  resetUrl: string;
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>Reset your password</Heading>
          <Text>Click the link below to reset your password. This link expires in 1 hour.</Text>
          <Link href={resetUrl}>Reset password</Link>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 6: Create `packages/email/src/index.ts`**

```ts
export { sendEmail } from './client';
export { WelcomeEmail } from './templates/welcome';
export { PasswordResetEmail } from './templates/password-reset';
```

- [ ] **Step 7: Commit**

```bash
git add packages/email
git commit -m "feat: add @koeti/email (Resend client + WelcomeEmail + PasswordResetEmail)"
```

---

## Task 8: @koeti/analytics package

**Files:**

- Create: `packages/analytics/package.json`
- Create: `packages/analytics/tsconfig.json`
- Create: `packages/analytics/src/server.ts`
- Create: `packages/analytics/src/client.ts`
- Create: `packages/analytics/src/index.ts`

- [ ] **Step 1: Create `packages/analytics/package.json`**

```json
{
  "name": "@koeti/analytics",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./client": "./src/client.ts"
  },
  "dependencies": {
    "posthog-js": "^1.250.0",
    "posthog-node": "^4.17.1"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Create `packages/analytics/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/base",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/analytics/src/server.ts`**

```ts
import { PostHog } from 'posthog-node';

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
  flushAt: 1,
  flushInterval: 0,
});

export function track(event: string, props?: Record<string, unknown> & { userId?: string }) {
  const { userId, ...rest } = props ?? {};
  client.capture({ distinctId: userId ?? 'anonymous', event, properties: rest });
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  client.identify({ distinctId: userId, properties: traits });
}
```

- [ ] **Step 4: Create `packages/analytics/src/client.ts`**

```ts
'use client';

import posthog from 'posthog-js';

let initialized = false;

function init() {
  if (initialized || typeof window === 'undefined') return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
  });
  initialized = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  init();
  posthog.capture(event, props);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  init();
  posthog.identify(userId, traits);
}
```

- [ ] **Step 5: Create `packages/analytics/src/index.ts`**

```ts
// Server-side by default
export { track, identify } from './server';
```

- [ ] **Step 6: Commit**

```bash
git add packages/analytics
git commit -m "feat: add @koeti/analytics (PostHog wrapper, server + client)"
```

---

## Task 9: Wire saas-template to @koeti/* packages

**Files:**

- Modify: `apps/saas-template/package.json`
- Modify: `apps/saas-template/tsconfig.json`
- Modify: `apps/saas-template/lib/db/drizzle.ts`
- Modify: `apps/saas-template/lib/db/queries.ts`
- Modify: `apps/saas-template/lib/db/schema.ts`
- Modify: `apps/saas-template/lib/auth/session.ts`
- Modify: `apps/saas-template/lib/auth/middleware.ts`
- Modify: `apps/saas-template/lib/payments/stripe.ts`
- Modify: `apps/saas-template/middleware.ts`
- Modify: `apps/saas-template/components/ui/` (remove — now in @koeti/ui)

- [ ] **Step 1: Update `apps/saas-template/package.json`**

Replace with:

```json
{
  "name": "@koeti/saas-template",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "npx tsx lib/db/seed.ts"
  },
  "dependencies": {
    "@koeti/auth": "workspace:*",
    "@koeti/billing": "workspace:*",
    "@koeti/db": "workspace:*",
    "@koeti/email": "workspace:*",
    "@koeti/analytics": "workspace:*",
    "@koeti/ui": "workspace:*",
    "@tailwindcss/postcss": "4.1.7",
    "dotenv": "^16.5.0",
    "drizzle-kit": "^0.31.1",
    "drizzle-orm": "^0.43.1",
    "next": "15.6.0-canary.59",
    "postcss": "^8.5.3",
    "postgres": "^3.4.5",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "server-only": "^0.0.1",
    "swr": "^2.3.3",
    "tailwindcss": "4.1.7",
    "tw-animate-css": "^1.3.0",
    "zod": "^3.24.4"
  },
  "devDependencies": {
    "@koeti/config": "workspace:*",
    "@types/node": "^22.15.18",
    "@types/react": "19.1.4",
    "@types/react-dom": "19.1.5",
    "typescript": "^5.8.3"
  }
}
```

- [ ] **Step 2: Update `apps/saas-template/tsconfig.json`**

```json
{
  "extends": "@koeti/config/tsconfig/nextjs",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

- [ ] **Step 3: Update `apps/saas-template/lib/db/drizzle.ts`**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { baseSchema } from '@koeti/db';
import * as appSchema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

export const client = postgres(process.env.POSTGRES_URL);
export const db = drizzle(client, { schema: { ...baseSchema, ...appSchema } });
```

- [ ] **Step 4: Update `apps/saas-template/lib/db/schema.ts`**

Replace the full file with an empty app schema (all base tables now live in @koeti/db):

```ts
// App-specific tables go here.
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.

// Re-export base types for convenience
export type {
  User,
  NewUser,
  Team,
  NewTeam,
  TeamMember,
  NewTeamMember,
  ActivityLog,
  NewActivityLog,
  Invitation,
  NewInvitation,
  TeamDataWithMembers,
} from '@koeti/db';
export { ActivityType } from '@koeti/db';
```

- [ ] **Step 5: Update `apps/saas-template/lib/db/queries.ts`**

Replace `@/lib/auth/session` import with `@koeti/auth`, and fix schema imports:

```ts
import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { verifyToken } from '@koeti/auth';
import { cookies } from 'next/headers';
import { activityLogs, teamMembers, teams, users } from '@koeti/db';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie?.value) return null;
  const sessionData = await verifyToken(sessionCookie.value);
  if (!sessionData?.user || typeof sessionData.user.id !== 'number') return null;
  if (new Date(sessionData.expires) < new Date()) return null;
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);
  return user[0] ?? null;
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);
  return result[0] ?? null;
}

export async function updateTeamSubscription(
  teamId: number,
  data: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  },
) {
  await db
    .update(teams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({ user: users, teamId: teamMembers.teamId })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) throw new Error('User not authenticated');
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) return null;
  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });
  return result?.team ?? null;
}
```

- [ ] **Step 6: Replace `apps/saas-template/lib/auth/session.ts`**

```ts
// Re-export from @koeti/auth — no local auth implementation
export {
  hashPassword,
  comparePasswords,
  signToken,
  verifyToken,
  getSession,
  setSession,
} from '@koeti/auth';
```

- [ ] **Step 7: Update `apps/saas-template/lib/auth/middleware.ts`**

Fix imports to use `@koeti/db` types and local queries:

```ts
import { z } from 'zod';
import type { TeamDataWithMembers, User } from '@koeti/db';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
import { validatedAction } from '@koeti/auth';

export type { ActionState } from '@koeti/auth';
export { validatedAction };

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User,
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
) {
  return async (prevState: any, formData: FormData) => {
    const user = await getUser();
    if (!user) throw new Error('User is not authenticated');
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) return { error: result.error.errors[0].message };
    return action(result.data, formData, user);
  };
}

type ActionWithTeamFunction<T> = (formData: FormData, team: TeamDataWithMembers) => Promise<T>;

export function withTeam<T>(action: ActionWithTeamFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) redirect('/sign-in');
    const team = await getTeamForUser();
    if (!team) throw new Error('Team not found');
    return action(formData, team);
  };
}
```

- [ ] **Step 8: Update `apps/saas-template/lib/payments/stripe.ts`**

```ts
export {
  stripe,
  createCheckoutSession,
  createCustomerPortalSession,
  handleSubscriptionChange,
  getStripePrices,
  getStripeProducts,
} from '@koeti/billing';
```

- [ ] **Step 9: Update `apps/saas-template/middleware.ts`**

```ts
import { createAuthMiddleware } from '@koeti/auth';

export const { middleware, config } = createAuthMiddleware({
  protectedRoutes: ['/dashboard'],
});
```

- [ ] **Step 10: Update `apps/saas-template/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['../../packages/db/src/schema.ts', './lib/db/schema.ts'],
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.POSTGRES_URL! },
});
```

- [ ] **Step 11: Remove local components/ui (now in @koeti/ui)**

```bash
rm -rf apps/saas-template/components/ui
```

Search for `from '@/components/ui/` in all saas-template files and replace with `from '@koeti/ui'`:

```bash
grep -r "from '@/components/ui/" apps/saas-template --include="*.tsx" --include="*.ts" -l
# For each file, replace:
# from '@/components/ui/button' → from '@koeti/ui'
# from '@/components/ui/card' → from '@koeti/ui'
# etc. (all components now exported from @koeti/ui)
```

Also replace `from "@/lib/utils"` → `from "@koeti/ui"` (the `cn` function moved there).

- [ ] **Step 12: Update webhook route to pass DI deps**

Update `apps/saas-template/app/api/stripe/webhook/route.ts`:

```ts
import { stripe, handleSubscriptionChange } from '@koeti/billing';
import { getTeamByStripeCustomerId, updateTeamSubscription } from '@/lib/db/queries';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err);
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }
  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription, {
        getTeamByStripeCustomerId,
        updateTeamSubscription,
      });
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  return NextResponse.json({ received: true });
}
```

- [ ] **Step 13: Run pnpm install and check TypeScript**

```bash
pnpm install
pnpm --filter @koeti/saas-template exec tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 14: Commit**

```bash
git add apps/saas-template
git commit -m "feat: wire saas-template to @koeti/* packages"
```

---

## Task 10: create-mvp.mjs generator

**Files:**

- Create: `scripts/create-mvp.mjs`

- [ ] **Step 1: Create `scripts/create-mvp.mjs`**

```js
#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const name = process.argv[2];
if (!name) {
  console.error('Usage: pnpm create-mvp <saas-name>');
  process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error('Name must be lowercase alphanumeric with dashes (e.g. my-saas)');
  process.exit(1);
}

const src = join(root, 'apps', 'saas-template');
const dest = join(root, 'apps', name);

if (existsSync(dest)) {
  console.error(`apps/${name} already exists`);
  process.exit(1);
}

console.log(`\n🏗  Scaffolding @koeti/${name}...\n`);

// Copy template
cpSync(src, dest, {
  recursive: true,
  filter: (src) =>
    !src.includes('node_modules') && !src.includes('.next') && !src.includes('lib/db/migrations'),
});

// Update package.json
const pkgPath = join(dest, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
pkg.name = `@koeti/${name}`;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// Replace saas-template references in key files
const filesToPatch = ['README.md'];
for (const file of filesToPatch) {
  const filePath = join(dest, file);
  if (!existsSync(filePath)) continue;
  const content = readFileSync(filePath, 'utf-8');
  writeFileSync(
    filePath,
    content.replaceAll('saas-template', name).replaceAll('Saas Template', name),
  );
}

// Create empty app schema
const schemaPath = join(dest, 'lib', 'db', 'schema.ts');
writeFileSync(
  schemaPath,
  `// App-specific tables for @koeti/${name}
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.
// Re-export base types for convenience
export type {
  User, NewUser, Team, NewTeam, TeamMember, NewTeamMember,
  ActivityLog, NewActivityLog, Invitation, NewInvitation, TeamDataWithMembers,
} from '@koeti/db'
export { ActivityType } from '@koeti/db'
`,
);

// Create empty migrations dir
mkdirSync(join(dest, 'lib', 'db', 'migrations'), { recursive: true });

// Create .env.local.example
writeFileSync(
  join(dest, '.env.local.example'),
  `# Database
POSTGRES_URL=

# Auth
AUTH_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BASE_URL=http://localhost:3000

# Email
RESEND_API_KEY=

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=
POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
`,
);

console.log(`✅ Created apps/${name}/\n`);
console.log(`Next steps:`);
console.log(`  1. cd apps/${name} && cp .env.local.example .env.local`);
console.log(`  2. Fill in .env.local with your credentials`);
console.log(`  3. Define your DB schema in lib/db/schema.ts`);
console.log(`  4. pnpm --filter @koeti/${name} db:migrate`);
console.log(`  5. pnpm --filter @koeti/${name} dev`);
console.log(`\nRead AGENTS.md for patterns and conventions.\n`);
```

- [ ] **Step 2: Make executable and test**

```bash
chmod +x scripts/create-mvp.mjs
node scripts/create-mvp.mjs test-saas
ls apps/test-saas/
cat apps/test-saas/package.json
```

Expected: `apps/test-saas/` created with `"name": "@koeti/test-saas"`.

- [ ] **Step 3: Clean up test app**

```bash
rm -rf apps/test-saas
```

- [ ] **Step 4: Commit**

```bash
git add scripts/create-mvp.mjs
git commit -m "feat: add create-mvp.mjs generator"
```

---

## Task 11: End-to-end verification

- [ ] **Step 1: Install all dependencies**

```bash
pnpm install
```

Expected: all workspaces resolved, no peer dependency errors.

- [ ] **Step 2: TypeScript check on all packages**

```bash
pnpm --filter @koeti/db exec tsc --noEmit
pnpm --filter @koeti/auth exec tsc --noEmit
pnpm --filter @koeti/billing exec tsc --noEmit
pnpm --filter @koeti/ui exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: TypeScript check on saas-template**

```bash
pnpm --filter @koeti/saas-template exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Update AGENTS.md auth section**

Update the `@koeti/auth` section in `AGENTS.md` to clarify which wrappers are in `@koeti/auth` vs per-app `lib/auth/middleware.ts`:

```ts
// Direct from @koeti/auth (no DB needed):
import {
  getSession,
  setSession,
  hashPassword,
  comparePasswords,
  signToken,
  verifyToken,
} from '@koeti/auth';
import { validatedAction, createAuthMiddleware } from '@koeti/auth';
import type { ActionState } from '@koeti/auth';

// DB-aware wrappers — import from the app's own lib, not @koeti/auth:
import { validatedActionWithUser, withTeam } from '@/lib/auth/middleware';
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: end-to-end verification complete — monorepo factory ready"
```

---

## Done

The monorepo is ready. Each new SaaS:

```bash
pnpm create-mvp <name>
# → scaffold in apps/<name>/
# → define lib/db/schema.ts
# → pnpm --filter @koeti/<name> db:migrate
# → pnpm --filter @koeti/<name> dev
# → implement business logic
# → invoke design-taste-frontend before any UI work
```
