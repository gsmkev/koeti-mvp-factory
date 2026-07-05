// Dashboard home = the product overview. Replace the placeholder stats below
// with your app's domain metrics (see apps/gastos for a worked example).
// Team/subscription management lives at /dashboard/team — leave it there.
import {
  BarChart,
  Card,
  CardContent,
  DonutChart,
  LineChart,
  PageHeader,
  PrintButton,
  StatCard,
} from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { getTeamForUser } from '@/lib/db/queries';

// Placeholder chart data — replace with real queries scoped by team.id.
// Charts are zero-dependency SVG (render in server components, no client JS).
const trendValues = [12, 18, 15, 27, 32, 24, 38];
const breakdownValues = [42, 31, 18, 9];

export default async function OverviewPage() {
  const team = await getTeamForUser();
  if (!team) throw new Error('Team not found');

  const t = await getTranslations('overview');
  const tc = await getTranslations('common');
  const days = t.raw('days') as string[];
  const trend = trendValues.map((value, i) => ({ label: days[i], value }));
  const breakdown = [
    { label: t('sourceDirect'), value: breakdownValues[0] },
    { label: t('sourceSearch'), value: breakdownValues[1] },
    { label: t('sourceSocial'), value: breakdownValues[2] },
    { label: t('sourceEmail'), value: breakdownValues[3] },
  ];

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('description')} actions={<PrintButton />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('statTeamMembers')} value={team.teamMembers.length} />
        <StatCard label={t('statPlan')} value={team.planName ?? tc('free')} />
        <StatCard
          label={t('statActivityWeek')}
          value={trendValues.reduce((s, v) => s + v, 0)}
          delta={18}
          hint={t('hintVsLastWeek')}
          trend={trendValues}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <LineChart title={t('chartActivityWeek')} data={trend} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DonutChart
              title={t('chartBySource')}
              data={breakdown}
              centerLabel={t('centerVisits')}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <BarChart title={t('chartDailyActivity')} data={trend} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
