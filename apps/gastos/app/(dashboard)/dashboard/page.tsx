import Link from 'next/link'
import { ArrowRight, Receipt } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  DonutChart,
  EmptyState,
  groupSum,
  LineChart,
  PageHeader,
  PrintButton,
  StatCard,
  topN,
} from '@koeti/ui'
import { getTranslations } from 'next-intl/server'
import { getExpenses, getMonthTotal, getTeamForUser } from '@/lib/db/queries'

const money = (n: number) =>
  `$${n.toLocaleString('es', { minimumFractionDigits: 2 })}`

export default async function ResumenPage() {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')
  const [expenses, monthTotal, t, tcat] = await Promise.all([
    getExpenses(team.id),
    getMonthTotal(team.id),
    getTranslations('overview'),
    getTranslations('categories'),
  ])
  const catLabel = (c: string) => (['viaticos', 'materiales', 'software', 'otros'].includes(c) ? tcat(c) : c)

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthKey = monthStart.toISOString().slice(0, 7)
  const monthCount = expenses.filter((e) => e.spentAt.startsWith(monthKey)).length
  const recent = expenses.slice(0, 5)

  // Month-over-month delta (for expenses, spending less is good → deltaGoodDirection="down").
  const prevMonth = new Date(monthStart)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  const prevKey = prevMonth.toISOString().slice(0, 7)
  const prevTotal = expenses
    .filter((e) => e.spentAt.startsWith(prevKey))
    .reduce((s, e) => s + Number(e.amount), 0)
  const monthDelta =
    prevTotal > 0 ? Math.round(((monthTotal - prevTotal) / prevTotal) * 100) : undefined

  // Raw rows → chart data in one line each (helpers scope nothing — the query did).
  const byCategory = topN(
    groupSum(
      expenses,
      (e) => catLabel(e.category),
      (e) => Number(e.amount),
    ),
    5,
    tcat('otros'),
  )
  const byDay = groupSum(expenses, (e) => e.spentAt.slice(0, 10), (e) => Number(e.amount))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-14)
    .map((d) => ({ ...d, label: d.label.slice(5) })) // MM-DD

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <PrintButton>{t('downloadPdf')}</PrintButton>
            <Button asChild>
              <Link href="/dashboard/gastos">
                {t('registerExpense')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t('statMonthTotal')}
          value={money(monthTotal)}
          delta={monthDelta}
          deltaGoodDirection="down"
          hint={t('hintVsPrevMonth')}
          trend={byDay.map((d) => d.value)}
        />
        <StatCard label={t('statMonthExpenses')} value={monthCount} />
        <StatCard label={t('statTotalRecords')} value={expenses.length} />
      </div>

      {expenses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('chartByDay')}</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart data={byDay} valueFormat={money} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('chartByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={byCategory} valueFormat={money} centerLabel={t('centerTotal')} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('recentTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={recent}
            rowKey={(e) => e.id}
            columns={[
              { header: t('colDate'), cell: (e) => e.spentAt },
              {
                header: t('colCategory'),
                cell: (e) => (
                  <Badge variant="secondary">{catLabel(e.category)}</Badge>
                ),
              },
              { header: t('colDescription'), cell: (e) => e.description },
              {
                header: t('colAmount'),
                className: 'text-right',
                cell: (e) => money(Number(e.amount)),
              },
            ]}
            empty={
              <EmptyState
                icon={Receipt}
                title={t('emptyTitle')}
                description={t('emptyDesc')}
                className="border-none"
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}
