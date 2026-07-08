// Page — route /dashboard/suppliers.
import { ResourcePanel, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getSuppliers } from '@/lib/db/queries';
import { createSupplier, deleteSupplier, updateSupplier } from './actions';

export default async function SuppliersPage() {
  const { team } = await requireRole('viewer');
  const [suppliers, t] = await Promise.all([getSuppliers(team.id), getTranslations('suppliers')]);

  const fields = [
    { name: 'name', label: t('fieldName'), required: true },
    { name: 'contactName', label: t('fieldContactName') },
    { name: 'phone', label: t('fieldPhone') },
    { name: 'email', label: t('fieldEmail'), type: 'email' },
  ] satisfies ResourceField[];

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <ResourcePanel
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createSupplier}
        createLabel={t('createLabel')}
        columns={[
          { header: t('colName'), cell: (s) => s.name },
          { header: t('colContact'), cell: (s) => s.contactName ?? '—' },
          { header: t('colPhone'), cell: (s) => s.phone ?? '—' },
          { header: t('colEmail'), cell: (s) => s.email ?? '—' },
        ]}
        rows={suppliers}
        rowKey={(s) => s.id}
        onUpdate={updateSupplier}
        editLabel={t('editLabel')}
        onDelete={deleteSupplier}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDesc')}
      />
    </section>
  );
}
