# Frontend Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `@koeti/ui` with the primitives every SaaS in this factory needs, refresh `apps/saas-template` into a real generic baseline, and redesign koeti-pos's in-scope views on the same components while keeping its established till-green/receipt-mono theme.

**Architecture:** Three phases, in dependency order: (1) new `@koeti/ui` components, styled purely via existing CSS-variable tokens so any app's theme applies without component changes; (2) `apps/saas-template` landing/pricing/dashboard rewritten on those components — this becomes the scaffold `pnpm create-mvp` copies; (3) `apps/pos` redesigned on the same components, keeping its own theme.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, `radix-ui` (unified package, already a dependency), `class-variance-authority`, `sonner` (new dependency), TypeScript.

## Global Constraints

- Never import from another app (`apps/*`). Apps import only from `packages/`.
- Never run `npx shadcn add`. New primitives are added by hand to `packages/ui/src/components/`, matching the exact style of existing ones (`"use client"` where interactive, `import { X as XPrimitive } from "radix-ui";;`, `cn()` from `../utils`, `data-slot` attributes).
- Before implementing any page's visual layer (not the mechanical component primitives), invoke `frontend-design` with the page's purpose as context — this is a project rule (`.claude/rules/ui.md`), not optional.
- These new components are stateless, logic-free UI primitives — the meaningful "test" is that they typecheck and render as part of a real page. Verification per component task is `tsc --noEmit`; visual proof comes from the page tasks that consume them, which get Playwright screenshot checks per `.claude/rules/ui.md`'s existing pattern.
- `numeric` DB columns return `string` in JS — always `parseFloat()` before arithmetic (unchanged from existing pos code).
- Sign-in/sign-up pages are out of scope — do not touch them.

---

## Phase 1 — New `@koeti/ui` components

### Task 1: Table

**Files:**

- Create: `packages/ui/src/components/table.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption` — used by Tasks 11, 13, 14, 15 (inventory, sales, suppliers, dashboard top-products).

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/table.tsx
import * as React from 'react';

import { cn } from '../utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'text-muted-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/table';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/table.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Table primitive"
```

---

### Task 2: Badge

**Files:**

- Create: `packages/ui/src/components/badge.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Badge, badgeVariants` — variants: `default | secondary | destructive | outline`. Used by Task 13 (sale status), Task 11 (low-stock indicator).

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/badge.tsx
import * as React from 'react';
import { Slot as SlotPrimitive } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1 [&>svg]:size-3 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Badge, badgeVariants } from './components/badge';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/badge.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Badge primitive"
```

---

### Task 3: Textarea

**Files:**

- Create: `packages/ui/src/components/textarea.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Textarea` — used by Task 14 (supplier contact field, optional upgrade from Input).

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/textarea.tsx
import * as React from 'react';

import { cn } from '../utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Textarea } from './components/textarea';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/textarea.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Textarea primitive"
```

---

### Task 4: Skeleton

**Files:**

- Create: `packages/ui/src/components/skeleton.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Skeleton` — used by Task 12 (POS product grid loading state).

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/skeleton.tsx
import { cn } from '../utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-accent animate-pulse rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Skeleton } from './components/skeleton';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/skeleton.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Skeleton primitive"
```

---

### Task 5: Separator

**Files:**

- Create: `packages/ui/src/components/separator.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Separator` — used by Task 15 (dashboard), Task 16-18 (settings pages) to replace ad-hoc `border-t` divs.

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/separator.tsx
'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from 'radix-ui';

import { cn } from '../utils';

function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Separator } from './components/separator';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/separator.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Separator primitive"
```

---

### Task 6: Switch

**Files:**

- Create: `packages/ui/src/components/switch.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Switch` — no urgent consumer this round; fills a real gap in the primitive set per the design spec.

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/switch.tsx
'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '../utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Switch } from './components/switch';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/switch.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Switch primitive"
```

---

### Task 7: Tabs

**Files:**

- Create: `packages/ui/src/components/tabs.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Tabs, TabsList, TabsTrigger, TabsContent` — used by Task 16 (settings sub-nav, replacing the current manual `Button`-per-link tab pattern).

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/tabs.tsx
'use client';

import * as React from 'react';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '../utils';

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]',
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/tabs.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Tabs primitive"
```

---

### Task 8: Select

**Files:**

- Create: `packages/ui/src/components/select.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator` — used by Task 14 (suppliers payment-form supplier picker, replacing the raw `<select>`).

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/select.tsx
'use client';

import * as React from 'react';
import { Select as SelectPrimitive } from 'radix-ui';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

import { cn } from '../utils';

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = 'default',
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn('flex cursor-default items-center justify-center py-1', className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/select';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/select.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Select primitive"
```

---

### Task 9: Dialog

**Files:**

- Create: `packages/ui/src/components/dialog.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose` — used by Task 11 (inventory product form), Task 14 (supplier + payment forms) to replace the current always-visible/toggle-open inline forms.

- [ ] **Step 1: Create the component**

```tsx
// packages/ui/src/components/dialog.tsx
'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { XIcon } from 'lucide-react';

import { cn } from '../utils';

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
};
```

- [ ] **Step 2: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from './components/dialog';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/src/components/dialog.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Dialog primitive"
```

---

### Task 10: Sonner (toast)

**Files:**

- Modify: `packages/ui/package.json` (add `sonner` dependency)
- Create: `packages/ui/src/components/sonner.tsx`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**

- Produces: `Toaster` (component to mount once in each app's root layout), `toast` (function, re-exported from `sonner`) — used by Task 12, 14 (replacing inline "Guardado"/error `<p>` feedback).

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter @koeti/ui add sonner
```

- [ ] **Step 2: Create the themed Toaster wrapper**

```tsx
// packages/ui/src/components/sonner.tsx
'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      data-slot="toaster"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
```

- [ ] **Step 3: Export from the package index**

Add to `packages/ui/src/index.ts`:

```ts
export { Toaster } from './components/sonner';
export { toast } from 'sonner';
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @koeti/ui exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/package.json packages/ui/src/components/sonner.tsx packages/ui/src/index.ts
git commit -m "feat(ui): add Sonner-based Toaster + toast"
```

---

## Phase 2 — `apps/saas-template` refresh

### Task 11: Rewrite saas-template landing page

**Files:**

- Modify: `apps/saas-template/app/(dashboard)/page.tsx`

**Interfaces:**

- Consumes: nothing new from earlier tasks (uses existing `Button`, `Card` from `@koeti/ui`).

- [ ] **Step 1: Invoke frontend-design for the generic landing**

Invoke the `frontend-design` skill with this context: "Generic SaaS landing page template for `apps/saas-template` — the scaffold every future app in this factory (`pnpm create-mvp`) inherits. Must look like a real, polished product landing, not a template placeholder, while staying content-neutral (no specific product features to sell yet — this is the baseline before an app's own identity is layered on)." Use its output to guide copy and layout in the next step.

- [ ] **Step 2: Implement the page**

Replace `apps/saas-template/app/(dashboard)/page.tsx`, following the frontend-design direction from Step 1. Keep the file a server component; no new data dependencies. Use `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle` from `@koeti/ui`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/saas-template exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify locally**

```bash
pnpm --filter @koeti/saas-template dev
```

Navigate to `http://localhost:3000`. Take a Playwright screenshot. Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add apps/saas-template/app/\(dashboard\)/page.tsx
git commit -m "feat(saas-template): redesign generic landing page"
```

---

### Task 12: Rewrite saas-template pricing page

**Files:**

- Modify: `apps/saas-template/app/(dashboard)/pricing/page.tsx`

**Interfaces:**

- Consumes: `Badge` (Task 2) for plan highlight, existing `getStripePrices`/`getStripeProducts`/`checkoutAction` (unchanged).

- [ ] **Step 1: Invoke frontend-design for the pricing page**

Invoke `frontend-design` with context: "Generic two-tier SaaS pricing page for the shared scaffold template — same constraints as the landing page (polished, content-neutral, this is the baseline other apps build on)."

- [ ] **Step 2: Implement the page**

Replace `apps/saas-template/app/(dashboard)/pricing/page.tsx` per the frontend-design direction. Keep the existing `getStripePrices`/`getStripeProducts` data fetching and `checkoutAction` form wiring unchanged — this task only changes the JSX/visual layer. Use `Card`, `Badge`, `Button` from `@koeti/ui`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/saas-template exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify locally**

Navigate to `http://localhost:3000/pricing` with dev server running. Take a Playwright screenshot. Confirm no console errors.

- [ ] **Step 5: Commit**

```bash
git add apps/saas-template/app/\(dashboard\)/pricing/
git commit -m "feat(saas-template): redesign generic pricing page"
```

---

### Task 13: Rewrite saas-template dashboard shell (settings tabs)

**Files:**

- Modify: `apps/saas-template/app/(dashboard)/dashboard/layout.tsx`

**Interfaces:**

- Consumes: `Tabs, TabsList, TabsTrigger` (Task 7) — replaces the manual `Button`-per-link tab pattern with real Tabs driven by `usePathname()`.

- [ ] **Step 1: Implement the shell**

Replace the sidebar `<nav>` block in `apps/saas-template/app/(dashboard)/dashboard/layout.tsx` with `Tabs`/`TabsList`/`TabsTrigger`, keeping each trigger as a `Link` (via `asChild`) so navigation still works via real URLs, not tab-panel state. Keep the existing `navItems` array and mobile-header toggle logic; only the rendering of the nav list changes.

```tsx
<TabsList className="flex-col h-auto w-full items-stretch bg-transparent p-0 gap-1">
  {navItems.map((item) => (
    <TabsTrigger
      key={item.href}
      value={item.href}
      asChild
      className="justify-start data-[state=active]:bg-secondary data-[state=active]:shadow-none"
    >
      <Link href={item.href} onClick={() => setIsSidebarOpen(false)}>
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    </TabsTrigger>
  ))}
</TabsList>
```

Wrap this in a `<Tabs value={pathname}>` root (value doesn't drive content here — content is the routed page — so no `TabsContent` is rendered; this is a navigation-styled use of Tabs, matching the pattern already used for koeti-pos's settings sub-nav labels).

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @koeti/saas-template exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify locally**

Navigate to `http://localhost:3000/dashboard`, `/dashboard/general`, `/dashboard/activity`, `/dashboard/security`. Confirm the active tab highlights correctly and links navigate. Take Playwright screenshots.

- [ ] **Step 4: Commit**

```bash
git add apps/saas-template/app/\(dashboard\)/dashboard/layout.tsx
git commit -m "feat(saas-template): dashboard shell uses Tabs primitive"
```

---

## Phase 3 — `apps/pos` redesign

### Task 14: Redesign pos landing + pricing pages

**Files:**

- Modify: `apps/pos/app/(dashboard)/page.tsx`
- Modify: `apps/pos/app/(dashboard)/pricing/page.tsx`

**Interfaces:**

- Consumes: `Badge` (Task 2), existing `Button`, `Card` — same components as saas-template's version, different theme (till-green/receipt-mono, already in `apps/pos/app/globals.css` and `layout.tsx`) and POS-specific copy.

- [ ] **Step 1: Invoke frontend-design for koeti-pos's landing + pricing**

Invoke `frontend-design` with context: "koeti-pos landing and pricing pages — a point-of-sale app for small businesses (Spanish-language UI), till-green primary color, IBM Plex Sans/Mono, warm paper background, receipt-style tabular-mono figures already established in the app. Landing should sell the actual product (sell from a catalog, track stock, pay suppliers, see a dashboard) — not generic SaaS copy."

- [ ] **Step 2: Implement the landing page**

Replace `apps/pos/app/(dashboard)/page.tsx` per the frontend-design direction, in Spanish, describing the real koeti-pos feature set (catalog + cart checkout, inventory tracking, supplier payments, dashboard). Use `Button`, `Card` from `@koeti/ui`.

- [ ] **Step 3: Implement the pricing page**

Replace `apps/pos/app/(dashboard)/pricing/page.tsx` per the frontend-design direction, keeping the existing `getStripePrices`/`getStripeProducts`/`checkoutAction` wiring unchanged. Use `Card`, `Badge`, `Button` from `@koeti/ui`.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify locally**

Navigate to `http://localhost:3000/` and `/pricing` with dev server running. Take Playwright screenshots of both.

- [ ] **Step 6: Commit**

```bash
git add apps/pos/app/\(dashboard\)/page.tsx apps/pos/app/\(dashboard\)/pricing/
git commit -m "feat(pos): redesign landing and pricing pages"
```

---

### Task 15: Redesign inventory page with Table + Dialog

**Files:**

- Modify: `apps/pos/app/(dashboard)/inventory/page.tsx`
- Modify: `apps/pos/app/(dashboard)/inventory/product-form.tsx`

**Interfaces:**

- Consumes: `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` (Task 1), `Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle` (Task 9), `Badge` (Task 2, for low-stock), `toast` (Task 10).
- Produces: same `ProductForm` props (`{ product?: Product }`) — no change to the calling contract, only its internal rendering (raw `<table>`/toggle-form → `Table`/`Dialog`).

- [ ] **Step 1: Rewrite the inventory page to use Table**

Replace the `<table>`/`<thead>`/`<tbody>` markup in `apps/pos/app/(dashboard)/inventory/page.tsx` with `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@koeti/ui`. Keep the same data (`getProducts(team.id)`), same columns (Nombre, SKU, Precio, Stock, action). Add a `Badge` with `variant="destructive"` next to stock when `p.stock === 0`, and `variant="outline"` when `p.stock > 0 && p.stock <= 5` (low-stock indicator — a real gap the current raw-number display doesn't surface).

- [ ] **Step 2: Rewrite ProductForm to use Dialog instead of the useState toggle**

Replace the `editing`/`setEditing` toggle-button pattern in `apps/pos/app/(dashboard)/inventory/product-form.tsx` with `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle`. The trigger button stays "Nuevo producto" / "Editar"; the form now renders inside `DialogContent` instead of inline in the page flow. On successful submit, call `toast.success('Guardado')` (import `toast` from `@koeti/ui`) instead of the inline `state?.success` paragraph, and close the dialog (track open state with `useState` bound to `Dialog`'s `open`/`onOpenChange`, closing it in the existing `useEffect` that currently calls `setEditing(false)`).

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify locally**

Navigate to `/inventory`. Confirm: table renders with existing test data, "Nuevo producto" opens a dialog, creating a product shows a toast and closes the dialog, "Editar" opens a pre-filled dialog. Take Playwright screenshots of both the empty state (no products) and populated state.

- [ ] **Step 5: Commit**

```bash
git add apps/pos/app/\(dashboard\)/inventory/
git commit -m "feat(pos): inventory uses Table + Dialog + toast"
```

---

### Task 16: Redesign suppliers page with Table + Dialog + Select

**Files:**

- Modify: `apps/pos/app/(dashboard)/suppliers/page.tsx`
- Modify: `apps/pos/app/(dashboard)/suppliers/supplier-form.tsx`
- Modify: `apps/pos/app/(dashboard)/suppliers/payment-form.tsx`

**Interfaces:**

- Consumes: `Table*` (Task 1), `Dialog*` (Task 9), `Select, SelectTrigger, SelectValue, SelectContent, SelectItem` (Task 8), `Textarea` (Task 3, optional for contact field), `toast` (Task 10).
- Produces: same `SupplierForm`/`PaymentForm` prop contracts, unchanged.

- [ ] **Step 1: Rewrite the suppliers page to use Table**

Same pattern as Task 15 Step 1, applied to both tables in `apps/pos/app/(dashboard)/suppliers/page.tsx` (suppliers list, payments list).

- [ ] **Step 2: Rewrite SupplierForm to use Dialog**

Same pattern as Task 15 Step 2, applied to `supplier-form.tsx`.

- [ ] **Step 3: Rewrite PaymentForm to use Dialog + Select**

Apply the Dialog pattern to `payment-form.tsx`. Replace the raw `<select name="supplierId">` with `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem`, keeping `name="supplierId"` on a hidden input synced to the Select's `onValueChange` (Radix Select doesn't submit a native form value by itself — bind `value`/`onValueChange` to local state and render `<input type="hidden" name="supplierId" value={selected} />`).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify locally**

Navigate to `/suppliers`. Confirm: tables render, both dialogs open/close correctly, the Select-based supplier picker in the payment dialog submits the right `supplierId`. Take Playwright screenshots of empty and populated states.

- [ ] **Step 6: Commit**

```bash
git add apps/pos/app/\(dashboard\)/suppliers/
git commit -m "feat(pos): suppliers uses Table + Dialog + Select"
```

---

### Task 17: Redesign POS screen with Skeleton loading state

**Files:**

- Modify: `apps/pos/app/(dashboard)/pos/page.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 4), `toast` (Task 10).
- Produces: same page, no prop/behavior contract changes — visual/loading-state only.

- [ ] **Step 1: Add a loading state to the product grid**

In `apps/pos/app/(dashboard)/pos/page.tsx`, add a `loading` boolean state, `true` until the initial `/api/products` fetch resolves. While `loading`, render a grid of `Skeleton` blocks matching the product tile's dimensions (`h-[88px] rounded-lg`) instead of the empty grid.

- [ ] **Step 2: Replace inline error/success text with toast**

Replace the `error`/`success` `<p>` elements with `toast.error(...)` / `toast.success(...)` calls at the point `createSale` resolves, removing the now-unused `error`/`success` state variables.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify locally**

Navigate to `/pos`. Confirm the skeleton briefly shows on load (throttle network in devtools if needed to observe it), then the real grid appears. Complete a checkout and confirm a success toast appears. Take a Playwright screenshot.

- [ ] **Step 5: Commit**

```bash
git add apps/pos/app/\(dashboard\)/pos/page.tsx
git commit -m "feat(pos): POS screen uses Skeleton loading state + toast"
```

---

### Task 18: Redesign sales history with Table + Badge

**Files:**

- Modify: `apps/pos/app/(dashboard)/sales/page.tsx`
- Modify: `apps/pos/app/(dashboard)/sales/cancel-button.tsx`

**Interfaces:**

- Consumes: `Table*` (Task 1), `Badge` (Task 2, for Pagada/Cancelada status — replaces the hand-rolled `rounded-full` span), `toast` (Task 10).

- [ ] **Step 1: Rewrite the sale items sub-table to use Table**

Replace the inner `<table>` (sale line items) in `apps/pos/app/(dashboard)/sales/page.tsx` with `Table, TableBody, TableRow, TableCell` (no header needed for this compact inline table, matching current markup).

- [ ] **Step 2: Replace the status pill with Badge**

Replace the hand-rolled `<span className="rounded-full ...">` status indicator with `Badge`, `variant={sale.status === 'paid' ? 'default' : 'destructive'}`.

- [ ] **Step 3: Replace inline error text with toast in CancelButton**

In `cancel-button.tsx`, replace the `error` state + inline `<span>` with `toast.error(...)` on failure.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Verify locally**

Navigate to `/sales`. Confirm badges render correctly for paid/cancelled sales, cancel flow still works and shows a toast on error. Take Playwright screenshots of empty and populated states.

- [ ] **Step 6: Commit**

```bash
git add apps/pos/app/\(dashboard\)/sales/
git commit -m "feat(pos): sales history uses Table + Badge + toast"
```

---

### Task 19: Redesign dashboard KPIs with Table + Separator

**Files:**

- Modify: `apps/pos/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**

- Consumes: `Table*` (Task 1, for the top-products list), `Separator` (Task 5, optional visual refinement between KPI cards and the table section).

- [ ] **Step 1: Rewrite the top-products table**

Replace the raw `<table>` in `apps/pos/app/(dashboard)/dashboard/page.tsx` with `Table, TableHeader, TableBody, TableRow, TableHead, TableCell`. Keep the existing `getDashboardStats` data and period-filter logic unchanged — this task only changes the JSX for the table.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify locally**

Navigate to `/dashboard`. Confirm KPI cards and the top-products table render correctly with existing test data, across all three period filters. Take a Playwright screenshot.

- [ ] **Step 4: Commit**

```bash
git add apps/pos/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(pos): dashboard top-products table uses Table primitive"
```

---

### Task 20: Redesign settings sub-pages (general/activity/security) with Tabs + Separator

**Files:**

- Modify: `apps/pos/app/(dashboard)/dashboard/layout.tsx`
- Modify: `apps/pos/app/(dashboard)/dashboard/general/page.tsx`
- Modify: `apps/pos/app/(dashboard)/dashboard/activity/page.tsx`
- Modify: `apps/pos/app/(dashboard)/dashboard/security/page.tsx`

**Interfaces:**

- Consumes: `Tabs, TabsList, TabsTrigger` (Task 7, same pattern as Task 13's saas-template shell), `Separator` (Task 5), `toast` (Task 10, replacing inline success/error `<p>` tags in `general/page.tsx`'s account form).

- [ ] **Step 1: Apply the Tabs shell**

Apply the same `Tabs`-based sidebar rewrite from Task 13 Step 1 to `apps/pos/app/(dashboard)/dashboard/layout.tsx` (the labels — Resumen/Cuenta/Actividad/Seguridad — and icons stay as already set this session; only the underlying markup changes from manual `Button`-per-link to `Tabs`/`TabsTrigger`).

- [ ] **Step 2: Replace inline success/error text with toast in the account form**

In `apps/pos/app/(dashboard)/dashboard/general/page.tsx`, replace the `state.error`/`state.success` `<p>` tags with `toast.error(...)`/`toast.success(...)` calls, driven by a `useEffect` watching `state`.

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify locally**

Navigate to `/dashboard/general`, `/dashboard/activity`, `/dashboard/security`. Confirm tabs highlight correctly, the account form shows a toast on save. Take Playwright screenshots.

- [ ] **Step 5: Commit**

```bash
git add apps/pos/app/\(dashboard\)/dashboard/
git commit -m "feat(pos): settings sub-pages use Tabs shell + toast"
```

---

### Task 21: Mount Toaster in both apps' root layouts

**Files:**

- Modify: `apps/pos/app/layout.tsx`
- Modify: `apps/saas-template/app/layout.tsx`

**Interfaces:**

- Consumes: `Toaster` (Task 10).

- [ ] **Step 1: Mount the Toaster in koeti-pos**

In `apps/pos/app/layout.tsx`, import `Toaster` from `@koeti/ui` and render `<Toaster position="top-right" />` once, inside `<body>`, alongside the existing `SWRConfig`.

- [ ] **Step 2: Mount the Toaster in saas-template**

Same change in `apps/saas-template/app/layout.tsx`.

- [ ] **Step 3: Typecheck both apps**

Run: `pnpm --filter @koeti/pos exec tsc --noEmit && pnpm --filter @koeti/saas-template exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify locally**

With both dev servers, trigger any toast (e.g. save a product in koeti-pos) and confirm it renders top-right and auto-dismisses.

- [ ] **Step 5: Commit**

```bash
git add apps/pos/app/layout.tsx apps/saas-template/app/layout.tsx
git commit -m "feat: mount Toaster in both apps' root layouts"
```

---

## Self-Review

**Spec coverage:**

- ✅ New `@koeti/ui` primitives (Table, Select, Dialog, Tabs, Badge, Textarea, Switch, Skeleton, Separator, Sonner) → Tasks 1–10
- ✅ saas-template landing/pricing/dashboard refresh → Tasks 11–13
- ✅ koeti-pos landing/pricing → Task 14
- ✅ koeti-pos inventory, suppliers, pos, sales, dashboard, settings → Tasks 15–20
- ✅ Toaster mounted in both apps → Task 21
- ✅ Sign-in/sign-up explicitly untouched (Global Constraints)
- ✅ Neutral shared base / koeti-pos keeps its own theme → no theme-token changes anywhere in this plan; only component/markup swaps

**Type consistency check:**

- `ProductForm`/`SupplierForm`/`PaymentForm` prop contracts (`{ product?: Product }` etc.) unchanged across Tasks 15–16 — verified against the existing files these tasks modify.
- `Toaster`/`toast` names consistent from Task 10's export through every consumer task (12, 14 numbering refers to inventory/suppliers pages — actually Tasks 15, 16, 17, 18, 20).

**Skipped (YAGNI):**

- A dark-mode toggle (Switch has no urgent consumer yet — added because it's a real gap in the primitive set, not because a page needs it this round).
- Storybook or a component playground — direct integration into real pages is the proof, per the design spec.
