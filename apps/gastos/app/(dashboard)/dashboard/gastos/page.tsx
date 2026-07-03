import Link from 'next/link'
import type { SearchParams } from 'nuqs/server'
import { Badge, ResourcePanel, StatCard, cn, type ResourceField } from '@koeti/ui'
import { getExpenses, getMonthTotal, getTeamForUser } from '@/lib/db/queries'
import { createExpense, deleteExpense, updateExpense } from './actions'
import { CATEGORIES, loadGastosSearchParams } from './search-params'

const CATEGORY_LABELS: Record<string, string> = {
  viaticos: 'Viáticos',
  materiales: 'Materiales',
  software: 'Software',
  otros: 'Otros',
}

const FIELDS = [
  { name: 'amount', label: 'Monto', type: 'number', step: '0.01', placeholder: '0.00', required: true },
  {
    name: 'category',
    label: 'Categoría',
    type: 'select',
    options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
  },
  { name: 'description', label: 'Descripción', placeholder: 'Ej: licencias anuales', required: true },
  { name: 'spentAt', label: 'Fecha', type: 'date', defaultValue: new Date().toISOString().slice(0, 10), required: true },
] satisfies ResourceField[]

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const team = await getTeamForUser()
  if (!team) throw new Error('Team not found')
  // URL = estado: ?categoria=software filtra y es deep-linkable desde otro MVP
  const { categoria } = await loadGastosSearchParams(searchParams)
  const [rows, monthTotal] = await Promise.all([
    getExpenses(team.id, categoria ?? undefined),
    getMonthTotal(team.id),
  ])

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <div className="grid gap-4 sm:max-w-xs">
        <StatCard
          label="Total del mes"
          value={`$${monthTotal.toLocaleString('es', { minimumFractionDigits: 2 })}`}
        />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por categoría">
        <Link href="/dashboard/gastos">
          <Badge variant={categoria ? 'outline' : 'default'} className={cn('cursor-pointer')}>
            Todas
          </Badge>
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/dashboard/gastos?categoria=${c}`}>
            <Badge variant={categoria === c ? 'default' : 'outline'} className="cursor-pointer">
              {CATEGORY_LABELS[c]}
            </Badge>
          </Link>
        ))}
      </nav>
      <ResourcePanel
        className="p-0 lg:p-0"
        title="Gastos"
        description="Registra y consulta los gastos de tu equipo."
        fields={FIELDS}
        onCreate={createExpense}
        createLabel="Registrar"
        columns={[
          { header: 'Fecha', cell: (e) => e.spentAt },
          { header: 'Categoría', cell: (e) => <Badge variant="secondary">{CATEGORY_LABELS[e.category] ?? e.category}</Badge> },
          { header: 'Descripción', cell: (e) => e.description },
          { header: 'Monto', className: 'text-right', cell: (e) => `$${Number(e.amount).toLocaleString('es', { minimumFractionDigits: 2 })}` },
        ]}
        rows={rows}
        rowKey={(e) => e.id}
        onUpdate={updateExpense}
        editLabel="Editar gasto"
        onDelete={deleteExpense}
        emptyTitle="Sin gastos todavía"
        emptyDescription="Registra el primer gasto de tu equipo con el formulario de arriba."
      />
    </section>
  )
}
