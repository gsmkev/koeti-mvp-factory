// Page — route /dashboard/clientes.
import Link from 'next/link';
import { Badge, ResourcePanel, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getClientes } from '@/lib/db/queries';
import { createCliente, deleteCliente, updateCliente } from './actions';

const money = (n: number) => `₲${n.toLocaleString('es')}`;

export default async function ClientesPage() {
  const { team } = await requireRole('viewer');
  const [rows, t] = await Promise.all([getClientes(team.id), getTranslations('clientes')]);

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
    <ResourcePanel
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
      onDelete={deleteCliente}
      emptyTitle={t('emptyTitle')}
      emptyDescription={t('emptyDesc')}
    />
  );
}
