// Page — route /dashboard/low-stock. Report, viewer-readable.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { Download } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, PageHeader } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getLowStockProducts, getProductCategories, getWarehouses } from '@/lib/db/queries';
import { loadLowStockSearchParams } from './search-params';

export default async function LowStockPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { warehouseId, category } = await loadLowStockSearchParams(searchParams);
  const [rows, warehouses, categories, t] = await Promise.all([
    getLowStockProducts(team.id, {
      warehouseId: warehouseId ?? undefined,
      category: category ?? undefined,
    }),
    getWarehouses(team.id),
    getProductCategories(team.id),
    getTranslations('lowStock'),
  ]);

  const hrefWith = (params: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    if (warehouseId) usp.set('warehouseId', String(warehouseId));
    if (category) usp.set('category', category);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) usp.delete(k);
      else usp.set(k, v);
    }
    const qs = usp.toString();
    return `/dashboard/low-stock${qs ? `?${qs}` : ''}`;
  };

  const exportQs = new URLSearchParams({
    ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
    ...(category ? { category } : {}),
  }).toString();

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/low-stock/export${exportQs ? `?${exportQs}` : ''}`} download>
              <Download />
              {t('exportCsv')}
            </a>
          </Button>
        }
      />
      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        <Link href={hrefWith({ warehouseId: undefined })}>
          <Badge variant={!warehouseId ? 'default' : 'outline'} className="cursor-pointer">
            {t('filterAllWarehouses')}
          </Badge>
        </Link>
        {warehouses.map((w) => (
          <Link key={w.id} href={hrefWith({ warehouseId: String(w.id) })}>
            <Badge
              variant={warehouseId === w.id ? 'default' : 'outline'}
              className="cursor-pointer"
            >
              {w.name}
            </Badge>
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        <Link href={hrefWith({ category: undefined })}>
          <Badge variant={!category ? 'default' : 'outline'} className="cursor-pointer">
            {t('filterAllCategories')}
          </Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c} href={hrefWith({ category: c })}>
            <Badge variant={category === c ? 'default' : 'outline'} className="cursor-pointer">
              {c}
            </Badge>
          </Link>
        ))}
      </nav>
      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        columns={[
          { header: t('colSku'), cell: (p) => p.sku },
          { header: t('colName'), cell: (p) => p.name },
          {
            header: t('colCategory'),
            cell: (p) => <Badge variant="secondary">{p.category}</Badge>,
          },
          {
            header: t('colStock'),
            className: 'text-right tabular-nums',
            cell: (p) => `${p.stock} ${p.unit}`,
          },
          {
            header: t('colMinStock'),
            className: 'text-right tabular-nums',
            cell: (p) => `${p.minStock} ${p.unit}`,
          },
        ]}
        empty={<EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />}
      />
    </section>
  );
}
