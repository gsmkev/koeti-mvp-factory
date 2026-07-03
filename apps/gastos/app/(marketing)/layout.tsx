'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { Button, ThemeToggle } from '@koeti/ui';
import { LayoutDashboard, LogOut } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@koeti/ui';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const APP_NAME = 'Gastos';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function UserMenu() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Link
          href="/pricing"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Precios
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Iniciar sesión
        </Link>
        <Button asChild size="sm">
          <Link href="/sign-up">Crear cuenta</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="size-9 cursor-pointer">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Panel</span>
          </Link>
        </DropdownMenuItem>
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

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex size-7 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              G
            </span>
            <span className="font-display text-lg font-semibold text-foreground">
              {APP_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <ThemeToggle />
            <Suspense fallback={<div className="h-9" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <p className="text-sm text-muted-foreground">
            {APP_NAME} — los gastos de tu equipo, en orden.
          </p>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Precios
          </Link>
        </div>
      </footer>
    </section>
  );
}
