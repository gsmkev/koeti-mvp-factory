'use client';
// Notifications bell — lives in the AppShell header `actions` slot. Polls
// /api/notifications via SWR; opening the dropdown marks everything read.
import Link from 'next/link';
import { Bell } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import { useTranslations } from 'next-intl';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from '@koeti/ui';
import type { Notification } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function relativeTime(t: ReturnType<typeof useTranslations>, iso: string | Date) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t('justNow');
  if (seconds < 3600) return t('minutesAgo', { count: Math.floor(seconds / 60) });
  if (seconds < 86400) return t('hoursAgo', { count: Math.floor(seconds / 3600) });
  if (seconds < 604800) return t('daysAgo', { count: Math.floor(seconds / 86400) });
  return new Date(iso).toLocaleDateString();
}

export function NotificationsBell() {
  const t = useTranslations('notifications');
  const tTime = useTranslations('activity');
  const { data } = useSWR<{ items: Notification[]; unread: number }>(
    '/api/notifications',
    fetcher,
    {
      refreshInterval: 60_000,
    },
  );
  const unread = data?.unread ?? 0;

  async function handleOpenChange(open: boolean) {
    if (!open || unread === 0) return;
    await fetch('/api/notifications', { method: 'POST' });
    mutate('/api/notifications');
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={unread > 0 ? t('ariaUnread', { count: unread }) : t('aria')}
          className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <p className="px-2 py-1.5 text-sm font-medium">{t('title')}</p>
        {!data || data.items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {data.items.map((n) => {
              const body = (
                <div className={cn('space-y-0.5', !n.readAt && 'font-medium')}>
                  <p className="text-sm leading-snug">
                    {/* dynamic key from the DB — typed keys can't know it */}
                    {t(n.messageKey as Parameters<typeof t>[0], JSON.parse(n.params))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(tTime, n.createdAt)}
                  </p>
                </div>
              );
              return (
                <DropdownMenuItem key={n.id} asChild={!!n.href} className="cursor-pointer">
                  {n.href ? <Link href={n.href}>{body}</Link> : body}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
