import Link from 'next/link'
import type { SearchParams } from 'nuqs/server'
import { Download } from 'lucide-react'
import { Badge, Button, ResourcePanel, StatCard, cn, type ResourceField } from '@koeti/ui'
import { getTranslations } from 'next-intl/server'
import { requireRole } from '@/lib/auth/middleware'
import { getExpenses, getMonthTotal } from '@/lib/db/queries'
import { createExpense, deleteExpense, updateExpense } from './actions'
import { CATEGORIES, loadGastosSearchParams } from './search-params'

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // RBAC en una línea: cualquier rol del equipo puede ver; las mutaciones
  // exigen 'member' vía crudActions (los viewers son solo lectura).
  const { team } = await requireRole('viewer')
  // URL = estado: ?categoria=software filtra y es deep-linkable desde otro MVP
  const { categoria } = await loadGastosSearchParams(searchParams)
  const [rows, monthTotal, t, tcat] = await Promise.all([
    getExpenses(team.id, categoria ?? undefined),
    getMonthTotal(team.id),
    getTranslations('gastos'),
    getTranslations('categories'),
  ])
  const catLabel = (c: string) => (CATEGORIES.includes(c as (typeof CATEGORIES)[number]) ? tcat(c) : c)

  const fields = [
    { name: 'amount', label: t('fieldAmount'), type: 'number', step: '0.01', placeholder: t('amountPlaceholder'), required: true },
    {
      name: 'category',
      label: t('fieldCategory'),
      type: 'select',
      options: CATEGORIES.map((value) => ({ value, label: tcat(value) })),
    },
    { name: 'description', label: t('fieldDescription'), placeholder: t('descPlaceholder'), required: true },
    { name: 'spentAt', label: t('fieldDate'), type: 'date', defaultValue: new Date().toISOString().slice(0, 10), required: true },
  ] satisfies ResourceField[]

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <div className="grid gap-4 sm:max-w-xs">
        <StatCard
          label={t('monthTotal')}
          value={`$${monthTotal.toLocaleString('es', { minimumFractionDigits: 2 })}`}
        />
      </div>
      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        <Link href="/dashboard/gastos">
          <Badge variant={categoria ? 'outline' : 'default'} className={cn('cursor-pointer')}>
            {t('filterAll')}
          </Badge>
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/dashboard/gastos?categoria=${c}`}>
            <Badge variant={categoria === c ? 'default' : 'outline'} className="cursor-pointer">
              {tcat(c)}
            </Badge>
          </Link>
        ))}
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <a href={`/api/gastos/export${categoria ? `?categoria=${categoria}` : ''}`} download>
            <Download />
            {t('exportCsv')}
          </a>
        </Button>
      </nav>
      <ResourcePanel
        className="p-0 lg:p-0"
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createExpense}
        createLabel={t('createLabel')}
        columns={[
          { header: t('colDate'), cell: (e) => e.spentAt },
          { header: t('colCategory'), cell: (e) => <Badge variant="secondary">{catLabel(e.category)}</Badge> },
          { header: t('colDescription'), cell: (e) => e.description },
          { header: t('colAmount'), className: 'text-right', cell: (e) => `$${Number(e.amount).toLocaleString('es', { minimumFractionDigits: 2 })}` },
        ]}
        rows={rows}
        rowKey={(e) => e.id}
        onUpdate={updateExpense}
        editLabel={t('editLabel')}
        onDelete={deleteExpense}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDesc')}
      />
    </section>
  )
}
