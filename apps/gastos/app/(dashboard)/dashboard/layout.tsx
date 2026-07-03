'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import {
  AppShell,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  type AppShellNavGroup
} from '@koeti/ui';
import { signOut } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const APP_NAME = 'Gastos';

const NAV: AppShellNavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Resumen', icon: <LayoutDashboard /> },
      { href: '/dashboard/gastos', label: 'Gastos', icon: <Receipt /> }
    ]
  },
  {
    label: 'Configuración',
    items: [
      { href: '/dashboard/team', label: 'Equipo', icon: <Users /> },
      { href: '/dashboard/general', label: 'General', icon: <Settings /> },
      { href: '/dashboard/security', label: 'Seguridad', icon: <Shield /> },
      { href: '/dashboard/api-keys', label: 'API Keys', icon: <KeyRound /> },
      { href: '/dashboard/activity', label: 'Actividad', icon: <Activity /> }
    ]
  }
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary font-display text-sm font-bold text-sidebar-primary-foreground"
        aria-hidden
      >
        G
      </span>
      <span className="font-display text-base font-semibold text-sidebar-primary">
        {APP_NAME}
      </span>
    </Link>
  );
}

function SidebarUser() {
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
          <AvatarFallback>
            {(user.name || user.email).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-sidebar-primary">
            {user.name || user.email}
          </span>
          {user.name && (
            <span className="block truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-56">
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      brand={<Brand />}
      nav={NAV}
      pathname={pathname}
      linkComponent={Link}
      footer={<SidebarUser />}
    >
      {children}
    </AppShell>
  );
}
