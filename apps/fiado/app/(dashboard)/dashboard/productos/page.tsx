// Page — route /dashboard/productos.
import { ResourcePanel, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getProductos } from '@/lib/db/queries';
import { createProducto, deleteProducto, updateProducto } from './actions';

const money = (n: number) => `₲${n.toLocaleString('es')}`;

export default async function ProductosPage() {
  // RBAC en una línea: cualquier rol del equipo puede ver; las mutaciones
  // exigen 'member' vía crudActions (los viewers son solo lectura).
  const { team } = await requireRole('viewer');
  const [rows, t] = await Promise.all([getProductos(team.id), getTranslations('productos')]);

  const fields = [
    { name: 'name', label: t('fieldName'), placeholder: t('namePlaceholder'), required: true },
    {
      name: 'price',
      label: t('fieldPrice'),
      type: 'number',
      step: '0.01',
      placeholder: '0',
      required: true,
    },
    { name: 'stock', label: t('fieldStock'), type: 'number', placeholder: '0', required: true },
  ] satisfies ResourceField[];

  return (
    <ResourcePanel
      title={t('panelTitle')}
      description={t('panelDesc')}
      fields={fields}
      onCreate={createProducto}
      createLabel={t('createLabel')}
      columns={[
        { header: t('colName'), cell: (p) => p.name },
        { header: t('colPrice'), className: 'text-right', cell: (p) => money(Number(p.price)) },
        { header: t('colStock'), className: 'text-right', cell: (p) => p.stock },
      ]}
      rows={rows}
      rowKey={(p) => p.id}
      onUpdate={updateProducto}
      editLabel={t('editLabel')}
      onDelete={deleteProducto}
      emptyTitle={t('emptyTitle')}
      emptyDescription={t('emptyDesc')}
    />
  );
}
