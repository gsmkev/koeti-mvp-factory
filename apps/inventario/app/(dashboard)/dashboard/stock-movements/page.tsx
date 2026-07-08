// Page — route /dashboard/stock-movements. The append-only ledger: a create
// form (ResourcePanel, no edit/delete — corrections are a new adjustment row)
// plus the filterable, exportable audit log below it.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { Download } from 'lucide-react';
import { Badge, Button, Pagination, ResourcePanel, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { MOVEMENT_TYPES } from '@/lib/db/schema';
import {
  MOVEMENTS_PAGE_SIZE,
  getProducts,
  getStockMovements,
  getWarehouses,
} from '@/lib/db/queries';
import { createStockMovement } from './actions';
import { loadMovementsSearchParams } from './search-params';

export default async function StockMovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { productId, warehouseId, type, from, to, page } =
    await loadMovementsSearchParams(searchParams);
  const [products, warehouses, fetched, t, tType, tCommon] = await Promise.all([
    getProducts(team.id),
    getWarehouses(team.id),
    getStockMovements(
      team.id,
      {
        productId: productId ?? undefined,
        warehouseId: warehouseId ?? undefined,
        type: type ?? undefined,
        from: from ?? undefined,
        to: to ?? undefined,
      },
      page,
    ),
    getTranslations('movements'),
    getTranslations('movementTypes'),
    getTranslations('common'),
  ]);
  const hasMore = fetched.length > MOVEMENTS_PAGE_SIZE;
  const rows = fetched.slice(0, MOVEMENTS_PAGE_SIZE);

  const fields = [
    {
      name: 'type',
      label: t('fieldType'),
      type: 'select',
      options: ['purchase', 'sale', 'return', 'damage', 'adjustment', 'transfer'].map((v) => ({
        value: v,
        label: tType(v),
      })),
    },
    {
      name: 'productId',
      label: t('fieldProduct'),
      type: 'select',
      options: products.map((p) => ({ value: String(p.id), label: `${p.sku} — ${p.name}` })),
    },
    {
      name: 'warehouseId',
      label: t('fieldWarehouse'),
      type: 'select',
      options: warehouses.map((w) => ({ value: String(w.id), label: w.name })),
    },
    {
      name: 'destinationWarehouseId',
      label: t('fieldDestination'),
      type: 'select',
      options: [
        { value: '', label: t('destinationNone') },
        ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
      ],
    },
    { name: 'quantity', label: t('fieldQuantity'), type: 'number', required: true },
    { name: 'unitCost', label: t('fieldUnitCost'), type: 'number', step: '0.01' },
    { name: 'batchNumber', label: t('fieldBatch') },
    { name: 'expiresAt', label: t('fieldExpiresAt'), type: 'date' },
    { name: 'note', label: t('fieldNote'), type: 'textarea' },
  ] satisfies ResourceField[];

  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (productId) params.set('productId', String(productId));
    if (warehouseId) params.set('warehouseId', String(warehouseId));
    if (type) params.set('type', type);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return `/dashboard/stock-movements${qs ? `?${qs}` : ''}`;
  };

  const exportParams = new URLSearchParams();
  if (productId) exportParams.set('productId', String(productId));
  if (warehouseId) exportParams.set('warehouseId', String(warehouseId));
  if (type) exportParams.set('type', type);
  if (from) exportParams.set('from', from);
  if (to) exportParams.set('to', to);
  const exportQs = exportParams.toString();

  const typeBadgeVariant = (mt: string) =>
    mt === 'sale' || mt === 'damage' || mt === 'transfer_out' ? 'destructive' : 'default';

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <ResourcePanel
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createStockMovement}
        createLabel={t('createLabel')}
        columns={[
          { header: t('colDate'), cell: (m) => m.createdAt.toLocaleString('es') },
          {
            header: t('colType'),
            cell: (m) => <Badge variant={typeBadgeVariant(m.type)}>{tType(m.type)}</Badge>,
          },
          { header: t('colProduct'), cell: (m) => `${m.productSku} — ${m.productName}` },
          { header: t('colWarehouse'), cell: (m) => m.warehouseName },
          {
            header: t('colQuantity'),
            className: 'text-right tabular-nums',
            cell: (m) => m.quantity,
          },
          { header: t('colUser'), cell: (m) => m.userName },
          { header: t('colNote'), cell: (m) => m.note ?? '—' },
        ]}
        rows={rows}
        rowKey={(m) => m.id}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDesc')}
      />
      <div className="flex flex-wrap items-center gap-2">
        <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
          <Link href={hrefFor(1)}>
            <Badge variant={!type ? 'default' : 'outline'} className="cursor-pointer">
              {t('filterAll')}
            </Badge>
          </Link>
          {MOVEMENT_TYPES.map((mt) => (
            <Link key={mt} href={`/dashboard/stock-movements?type=${mt}`}>
              <Badge variant={type === mt ? 'default' : 'outline'} className="cursor-pointer">
                {tType(mt)}
              </Badge>
            </Link>
          ))}
        </nav>
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <a href={`/api/stock-movements/export${exportQs ? `?${exportQs}` : ''}`} download>
            <Download />
            {t('exportCsv')}
          </a>
        </Button>
      </div>
      <Pagination
        page={page}
        hasMore={hasMore}
        hrefFor={hrefFor}
        linkComponent={Link}
        prevLabel={tCommon('prevPage')}
        nextLabel={tCommon('nextPage')}
      />
    </section>
  );
}
