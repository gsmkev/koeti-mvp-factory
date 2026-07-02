---
paths:
  - "**/app/**/*.tsx"
  - "**/components/**/*.tsx"
---

# UI rules

**Invoke the `frontend-design` skill before implementing any new page or component.** Pass the SaaS spec summary so it infers the right aesthetic. Do not skip this step.

## Component imports

```ts
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Label, cn } from '@koeti/ui'
import { Avatar, AvatarFallback } from '@koeti/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@koeti/ui'
// Dashboard composites — prefer these over hand-rolling:
import { PageHeader, DataTable, EmptyState, StatCard, SubmitButton } from '@koeti/ui'
```

For team-scoped CRUD pages, follow the full recipe in `.claude/rules/crud.md`.

- All shadcn primitives come from `@koeti/ui`. Never `import { Button } from '@/components/ui/button'`.
- App-specific components go in `apps/<name>/components/`. They import primitives from `@koeti/ui`.
- Never run `npx shadcn add` — the package is pre-populated.

## Route structure

```
app/
  (marketing)/   ← public: landing, pricing
  (dashboard)/   ← auth-gated: layout.tsx calls getUser(), redirects if null
```

## Analytics in components

```ts
// Client components
import { track } from '@koeti/analytics/client'
track('button_clicked', { label: 'upgrade' })

// Server components / actions
import { track } from '@koeti/analytics/server'
track('subscription_started', { plan: 'pro', userId: String(user.id) })
```
