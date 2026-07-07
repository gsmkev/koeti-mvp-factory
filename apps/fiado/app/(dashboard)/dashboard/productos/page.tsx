// Page — route /dashboard/productos.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { createLoader, parseAsStringEnum } from 'nuqs/server';
import { Badge, ResourcePanel, cn, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getProductos, STOCK_BAJO } from '@/lib/db/queries';
import { createProducto, deleteProducto, updateProducto } from './actions';

const money = (n: number) => `₲${n.toLocaleString('es')}`;
const loadSearchParams = createLoader({ estado: parseAsStringEnum(['agotados']) });

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // RBAC en una línea: cualquier rol del equipo puede ver; las mutaciones
  // exigen 'member' vía crudActions (los viewers son solo lectura).
  const { team } = await requireRole('viewer');
  const { estado } = await loadSearchParams(searchParams);
  const [allRows, t] = await Promise.all([getProductos(team.id), getTranslations('productos')]);

  const agotados = allRows.filter((p) => p.stock <= 0);
  const rows = estado === 'agotados' ? agotados : allRows;

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
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        <Link href="/dashboard/productos">
          <Badge variant={estado ? 'outline' : 'default'} className={cn('cursor-pointer')}>
            {t('filterAll')}
          </Badge>
        </Link>
        <Link href="/dashboard/productos?estado=agotados">
          <Badge variant={estado === 'agotados' ? 'default' : 'outline'} className="cursor-pointer">
            {t('filterAgotados', { count: agotados.length })}
          </Badge>
        </Link>
      </nav>
      <ResourcePanel
        className="p-0 lg:p-0"
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createProducto}
        createLabel={t('createLabel')}
        columns={[
          { header: t('colName'), cell: (p) => p.name },
          { header: t('colPrice'), className: 'text-right', cell: (p) => money(Number(p.price)) },
          {
            header: t('colStock'),
            className: 'text-right',
            cell: (p) =>
              p.stock <= 0 ? (
                <Badge variant="destructive">{t('outOfStock')}</Badge>
              ) : p.stock <= STOCK_BAJO ? (
                <Badge variant="secondary">{t('lowStock', { count: p.stock })}</Badge>
              ) : (
                p.stock
              ),
          },
        ]}
        rows={rows}
        rowKey={(p) => p.id}
        onUpdate={updateProducto}
        editLabel={t('editLabel')}
        onDelete={deleteProducto}
        emptyTitle={estado === 'agotados' ? t('emptyAgotadosTitle') : t('emptyTitle')}
        emptyDescription={estado === 'agotados' ? t('emptyAgotadosDesc') : t('emptyDesc')}
      />
    </section>
  );
}
