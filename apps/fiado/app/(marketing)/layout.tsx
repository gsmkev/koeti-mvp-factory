'use client';
// Layout for the marketing segment.

import Link from 'next/link';
import { Suspense } from 'react';
import { Button, ThemeToggle } from '@koeti/ui';
import { LocaleSwitcher } from '@koeti/i18n';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, LogOut } from 'lucide-react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@koeti/ui';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

import { APP_NAME } from '@/lib/site';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex size-7 items-center justify-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground ${className}`}
      aria-hidden
    >
      {APP_NAME[0]}
    </span>
  );
}

function UserMenu() {
  const t = useTranslations('nav');
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
          className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
        >
          {t('pricing')}
        </Link>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('signIn')}
        </Link>
        <Button asChild size="sm">
          <Link href="/sign-up">{t('getStarted')}</Link>
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
            <span>{t('dashboard')}</span>
          </Link>
        </DropdownMenuItem>
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

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  return (
    <section className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-lg font-semibold text-foreground">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden items-center gap-3 sm:flex">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            <Suspense fallback={<div className="h-9" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <p className="text-sm text-muted-foreground">{t('footerTagline', { app: APP_NAME })}</p>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('pricing')}
          </Link>
        </div>
      </footer>
    </section>
  );
}
