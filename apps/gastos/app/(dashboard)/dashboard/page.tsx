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
  EmptyState,
  PageHeader,
  StatCard,
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
