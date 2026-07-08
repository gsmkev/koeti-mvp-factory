'use client';
// Layout for /dashboard.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  ShoppingCart,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  AppShell,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  type AppShellNavGroup,
} from '@koeti/ui';
import { LocaleSwitcher } from '@koeti/i18n';
import { useTranslations } from 'next-intl';
import { signOut } from '@/app/(login)/actions';
import { MobileBottomNav } from '@/components/mobile-bottom-nav';
import { NotificationsBell } from '@/components/notifications-bell';
import { User } from '@/lib/db/schema';
import { APP_NAME } from '@/lib/site';
import { useIsOwner, useIsPremium } from '@/lib/use-is-owner';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Add one nav entry per domain entity to the first group (see .claude/rules/crud.md).
//
// "Insights" only shows for Premium teams — the daily cron only ever
// generates rows (low stock, over credit limit) for Premium (see
// /api/cron/insights), so a Básico team would only ever see an empty page.
//
// No "Claves API" entry either — API keys are for scripting/integrations,
// not something a despensa owner ever needs. The page itself is gated to
// SUPERADMIN_EMAIL only, same as /dashboard/admin (also intentionally absent
// from this nav).
//
// No "Facturas" entry — SIFEN e-invoicing is for the app's own Pagopar
// subscription billing, not a despensa concern. The route stays reachable
// (harmless, empty until a paid Pagopar order exists) but isn't worth a
// permanent nav slot for this audience.
//
// A vendedor sees everything here except "Empleados" — that's the one
// settings screen that's actually owner-exclusive (managing who has a login
// and the subscription live there; see requireRole('admin') on that page).
// General/Seguridad are each person's own account, not despensa-wide.
function useNav(): AppShellNavGroup[] {
  const t = useTranslations('nav');
  const tf = useTranslations('fiado');
  const isOwner = useIsOwner();
  const isPremium = useIsPremium();
  return [
    {
      items: [
        { href: '/dashboard', label: t('overview'), icon: <LayoutDashboard /> },
        { href: '/dashboard/pos', label: tf('navPos'), icon: <ShoppingCart /> },
        { href: '/dashboard/productos', label: tf('navProductos'), icon: <Package /> },
        { href: '/dashboard/clientes', label: tf('navClientes'), icon: <Users /> },
        { href: '/dashboard/ventas', label: tf('navVentas'), icon: <ReceiptText /> },
        ...(isPremium
          ? [{ href: '/dashboard/insights', label: t('insights'), icon: <Sparkles /> }]
          : []),
      ],
    },
    {
      label: t('settings'),
      items: [
        ...(isOwner ? [{ href: '/dashboard/team', label: t('team'), icon: <Users /> }] : []),
        { href: '/dashboard/general', label: t('general'), icon: <Settings /> },
        { href: '/dashboard/security', label: t('security'), icon: <Shield /> },
        { href: '/dashboard/activity', label: t('activity'), icon: <Activity /> },
      ],
    },
  ];
}

// Falls back to the "usuario" part of a synthetic usuario@<slug>.fiado.local
// address instead of ever showing that suffix — a real name is optional at
// sign-up, so this is the only thing standing between "Juan Pérez" and a
// raw "juan@despensadejuan.fiado.local" leaking into the UI.
function displayName(user: Pick<User, 'name' | 'email'>) {
  return user.name || user.email.split('@')[0];
}

function Brand() {
  // Ña Marta cares about "Despensa María", not the product's own name — show
  // her despensa's name as the headline, "Fiado" as a small caption.
  const { data: team } = useSWR<{ name: string }>('/api/team', fetcher);
  const name = team?.name ?? APP_NAME;
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground"
        aria-hidden
      >
        {name[0]}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-base font-semibold leading-tight text-sidebar-primary">
          {name}
        </span>
        <span className="block text-[11px] leading-none text-sidebar-foreground/50">
          {APP_NAME}
        </span>
      </span>
    </Link>
  );
}

function SidebarUser() {
  const t = useTranslations('nav');
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent">
        <Avatar className="size-8">
          <AvatarFallback>{displayName(user).slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-sidebar-primary">
            {displayName(user)}
          </span>
          {user.name && !user.email.endsWith('.fiado.local') && (
            <span className="block truncate text-xs text-sidebar-foreground/60">{user.email}</span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('signOut')}</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = useNav();

  return (
    <AppShell
      brand={<Brand />}
      nav={nav}
      actions={<NotificationsBell />}
      pathname={pathname}
      linkComponent={Link}
      footer={
        <div className="space-y-2">
          <LocaleSwitcher className="w-full" />
          <SidebarUser />
        </div>
      }
    >
      <div className="pb-20 lg:pb-0">{children}</div>
      <MobileBottomNav />
    </AppShell>
  );
}
