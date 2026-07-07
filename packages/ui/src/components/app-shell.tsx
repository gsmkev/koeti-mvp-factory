'use client';
// app shell — exported via @koeti/ui.

import * as React from 'react';
import { Menu, X } from 'lucide-react';

import { cn } from '../utils';
import { Button } from './button';
import { ThemeToggle } from './theme-toggle';

export type AppShellNavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

export type AppShellNavGroup = {
  label?: string;
  items: AppShellNavItem[];
};

type LinkLike = React.ComponentType<{
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  'aria-current'?: 'page';
}>;

function NavList({
  nav,
  pathname,
  Link,
  onNavigate,
}: {
  nav: AppShellNavGroup[];
  pathname: string;
  Link: LinkLike;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {nav.map((group, gi) => (
        <div key={gi} className="space-y-1">
          {group.label && (
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                {item.icon && <span className="[&>svg]:size-4 [&>svg]:shrink-0">{item.icon}</span>}
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

// App shell with a dark sidebar (desktop) and a drawer (mobile).
// Presentational only: the app passes `pathname` (usePathname) and its
// framework Link so this package stays free of a next.js dependency.
function AppShell({
  brand,
  nav,
  footer,
  actions,
  pathname,
  linkComponent,
  children,
}: {
  brand: React.ReactNode;
  nav: AppShellNavGroup[];
  footer?: React.ReactNode;
  /** Icon-sized controls next to the theme toggle (e.g. a notifications bell). */
  actions?: React.ReactNode;
  pathname: string;
  linkComponent?: LinkLike;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const Link = linkComponent ?? ((props) => <a {...props} />);
  const close = React.useCallback(() => setOpen(false), []);

  // `showClose` renders the drawer's close button in-flow with the other
  // header icons instead of layering a second, absolutely-positioned button
  // on top of them (which used to overlap the theme toggle).
  const renderSidebarContent = (showClose: boolean) => (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-5">
        {brand}
        <div className="flex items-center gap-1">
          {actions}
          <ThemeToggle />
          {showClose && (
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={close}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </Button>
          )}
        </div>
      </div>
      <NavList nav={nav} pathname={pathname} Link={Link} onNavigate={close} />
      {footer && <div className="border-t border-sidebar-border p-3">{footer}</div>}
    </>
  );

  return (
    <div
      data-slot="app-shell"
      className="min-h-dvh bg-background lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]"
    >
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        {brand}
        <div className="flex items-center gap-1">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" aria-hidden onClick={close} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export { AppShell };
