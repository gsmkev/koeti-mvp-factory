// Page — route /dashboard/insights. Cron-generated anomalies + suggestions.
import { AlertTriangle, Lightbulb, Sparkles, X } from 'lucide-react';
import { Badge, Card, CardContent, EmptyState, PageHeader } from '@koeti/ui';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getInsights } from '@/lib/db/queries';
import { dismissInsight } from './actions';

export default async function InsightsPage() {
  const { team } = await requireRole('viewer');
  const rows = await getInsights(team.id);
  const t = await getTranslations('insights');
  const tMsg = await getTranslations('insightMessages');
  const locale = await getLocale();

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('description')} />
      {rows.length === 0 ? (
        <EmptyState icon={Sparkles} title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const Icon = row.kind === 'suggestion' ? Lightbulb : AlertTriangle;
                return (
                  <li key={row.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="bg-accent rounded-full p-2" aria-hidden>
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {tMsg(row.messageKey, JSON.parse(row.params))}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={row.severity === 'warning' ? 'destructive' : 'secondary'}>
                          {row.kind === 'suggestion' ? t('kindSuggestion') : t('kindAnomaly')}
                        </Badge>
                        {row.createdAt.toLocaleDateString(locale)}
                      </p>
                    </div>
                    <form action={dismissInsight}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        aria-label={t('dismiss')}
                        title={t('dismiss')}
                        className="-m-2 flex size-11 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <X className="size-4" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
