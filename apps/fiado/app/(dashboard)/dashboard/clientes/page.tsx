// Page — route /dashboard/clientes.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { createLoader, parseAsStringEnum } from 'nuqs/server';
import { Badge, ResourcePanel, cn, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getClientes } from '@/lib/db/queries';
import { createCliente, deleteCliente, updateCliente } from './actions';

const money = (n: number) => `₲${n.toLocaleString('es-PY')}`;
const loadSearchParams = createLoader({ saldo: parseAsStringEnum(['con']) });

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { saldo } = await loadSearchParams(searchParams);
  const [allRows, t] = await Promise.all([getClientes(team.id), getTranslations('clientes')]);

  const conSaldo = allRows.filter((c) => Number(c.balance) > 0);
  const rows =
    saldo === 'con' ? [...conSaldo].sort((a, b) => Number(b.balance) - Number(a.balance)) : allRows;

  const fields = [
    { name: 'name', label: t('fieldName'), placeholder: t('namePlaceholder'), required: true },
    { name: 'phone', label: t('fieldPhone'), placeholder: t('phonePlaceholder') },
    {
      name: 'creditLimit',
      label: t('fieldCreditLimit'),
      type: 'number',
      step: '0.01',
      placeholder: '0',
      defaultValue: '0',
    },
  ] satisfies ResourceField[];

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        <Link href="/dashboard/clientes">
          <Badge variant={saldo ? 'outline' : 'default'} className={cn('cursor-pointer')}>
            {t('filterAll')}
          </Badge>
        </Link>
        <Link href="/dashboard/clientes?saldo=con">
          <Badge variant={saldo === 'con' ? 'default' : 'outline'} className="cursor-pointer">
            {t('filterConSaldo', { count: conSaldo.length })}
          </Badge>
        </Link>
      </nav>
      <ResourcePanel
        className="p-0 lg:p-0"
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createCliente}
        createLabel={t('createLabel')}
        columns={[
          {
            header: t('colName'),
            cell: (c) => (
              <Link href={`/dashboard/clientes/${c.id}`} className="font-medium hover:underline">
                {c.name}
              </Link>
            ),
          },
          { header: t('colPhone'), cell: (c) => c.phone ?? '—' },
          {
            header: t('colBalance'),
            className: 'text-right',
            cell: (c) =>
              Number(c.balance) > 0 ? (
                <Badge
                  variant={
                    Number(c.creditLimit) > 0 && Number(c.balance) > Number(c.creditLimit)
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {money(Number(c.balance))}
                </Badge>
              ) : (
                money(0)
              ),
          },
          {
            header: t('colCreditLimit'),
            className: 'text-right',
            cell: (c) => (Number(c.creditLimit) > 0 ? money(Number(c.creditLimit)) : t('noLimit')),
          },
        ]}
        rows={rows}
        rowKey={(c) => c.id}
        onUpdate={updateCliente}
        editLabel={t('editLabel')}
        saveLabel={t('saveLabel')}
        savingLabel={t('saving')}
        closeLabel={t('closeLabel')}
        onDelete={deleteCliente}
        deleteLabel={t('deleteLabel')}
        emptyTitle={saldo === 'con' ? t('emptyConSaldoTitle') : t('emptyTitle')}
        emptyDescription={saldo === 'con' ? t('emptyConSaldoDesc') : t('emptyDesc')}
      />
    </section>
  );
}
