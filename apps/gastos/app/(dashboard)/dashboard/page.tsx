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
  StatCard,
  topN,
} from '@koeti/ui'
import { getExpenses, getMonthTotal, getTeamForUser } from '@/lib/db/queries'

const CATEGORY_LABELS: Record<string, string> = {
  viaticos: 'Viáticos',
  materiales: 'Materiales',
  software: 'Software',
  otros: 'Otros',
}

const money = (n: number) =>
  `$${n.toLocaleString('es', { minimumFractionDigits: 2 })}`

export default async function ResumenPage() {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')
  const [expenses, monthTotal] = await Promise.all([
    getExpenses(team.id),
    getMonthTotal(team.id),
  ])

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthKey = monthStart.toISOString().slice(0, 7)
  const monthCount = expenses.filter((e) => e.spentAt.startsWith(monthKey)).length
  const recent = expenses.slice(0, 5)

  // Raw rows → chart data in one line each (helpers scope nothing — the query did).
  const byCategory = topN(
    groupSum(
      expenses,
      (e) => CATEGORY_LABELS[e.category] ?? e.category,
      (e) => Number(e.amount),
    ),
    5,
    'Otros',
  )
  const byDay = groupSum(expenses, (e) => e.spentAt.slice(0, 10), (e) => Number(e.amount))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-14)
    .map((d) => ({ ...d, label: d.label.slice(5) })) // MM-DD

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title="Resumen"
        description="El estado de los gastos de tu equipo, de un vistazo."
        actions={
          <Button asChild>
            <Link href="/dashboard/gastos">
              Registrar gasto
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total del mes" value={money(monthTotal)} />
        <StatCard label="Gastos este mes" value={monthCount} />
        <StatCard label="Registros totales" value={expenses.length} />
      </div>

      {expenses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Gastos por día</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart data={byDay} valueFormat={money} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Por categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={byCategory} valueFormat={money} centerLabel="total" />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Últimos gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={recent}
            rowKey={(e) => e.id}
            columns={[
              { header: 'Fecha', cell: (e) => e.spentAt },
              {
                header: 'Categoría',
                cell: (e) => (
                  <Badge variant="secondary">
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </Badge>
                ),
              },
              { header: 'Descripción', cell: (e) => e.description },
              {
                header: 'Monto',
                className: 'text-right',
                cell: (e) => money(Number(e.amount)),
              },
            ]}
            empty={
              <EmptyState
                icon={Receipt}
                title="Sin gastos todavía"
                description="Registra el primer gasto de tu equipo para ver el resumen aquí."
                className="border-none"
              />
            }
          />
        </CardContent>
      </Card>
    </section>
  )
}
