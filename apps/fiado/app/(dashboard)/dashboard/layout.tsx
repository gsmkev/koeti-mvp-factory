'use client';
// Layout for /dashboard.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  KeyRound,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Package,
  ReceiptText,
  ShoppingCart,
  Settings,
  Shield,
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
import { VerifyEmailBanner } from '@/components/verify-email-banner';
import { User } from '@/lib/db/schema';
import { APP_NAME } from '@/lib/site';
import useSWR, { mutate } from 'swr';

// Add one nav entry per domain entity to the first group (see .claude/rules/crud.md).
function useNav(): AppShellNavGroup[] {
  const t = useTranslations('nav');
  const tf = useTranslations('fiado');
  return [
    {
      items: [
        { href: '/dashboard', label: t('overview'), icon: <LayoutDashboard /> },
        { href: '/dashboard/pos', label: tf('navPos'), icon: <ShoppingCart /> },
        { href: '/dashboard/productos', label: tf('navProductos'), icon: <Package /> },
        { href: '/dashboard/clientes', label: tf('navClientes'), icon: <Users /> },
        { href: '/dashboard/ventas', label: tf('navVentas'), icon: <ReceiptText /> },
        { href: '/dashboard/insights', label: t('insights'), icon: <Lightbulb /> },
      ],
    },
    {
      label: t('settings'),
      items: [
        { href: '/dashboard/team', label: t('team'), icon: <Users /> },
        { href: '/dashboard/general', label: t('general'), icon: <Settings /> },
        { href: '/dashboard/security', label: t('security'), icon: <Shield /> },
        { href: '/dashboard/api-keys', label: t('apiKeys'), icon: <KeyRound /> },
        { href: '/dashboard/invoices', label: t('invoices'), icon: <ReceiptText /> },
        { href: '/dashboard/activity', label: t('activity'), icon: <Activity /> },
      ],
    },
  ];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground"
        aria-hidden
      >
        {APP_NAME[0]}
      </span>
      <span className="font-display text-base font-semibold text-sidebar-primary">{APP_NAME}</span>
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
          <AvatarFallback>{(user.name || user.email).slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-sidebar-primary">
            {user.name || user.email}
          </span>
          {user.name && (
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
      <VerifyEmailBanner />
      <div className="pb-20 lg:pb-0">{children}</div>
      <MobileBottomNav />
    </AppShell>
  );
}
