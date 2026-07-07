'use client';
// Team data export (GDPR / portability) — renders only for admins/owners.
// Self-contained: derives the caller's role from the same SWR data the team
// page already fetches, so it drops into any settings page with one line.
import useSWR from 'swr';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import type { TeamDataWithMembers, User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ExportDataCard() {
  const t = useTranslations('team');
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: team } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const role = team?.teamMembers?.find((m) => m.user.id === user?.id)?.role;
  if (role !== 'admin' && role !== 'owner') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('exportTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-prose text-sm text-muted-foreground">{t('exportDesc')}</p>
        <Button variant="outline" asChild>
          <a href="/api/team/export" download>
            <Download />
            {t('exportButton')}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
