// Page — route /dashboard/expiring-soon. Report, viewer-readable.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { Download } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, PageHeader } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getExpiringSoon, getWarehouses } from '@/lib/db/queries';
import { loadExpiringSoonSearchParams } from './search-params';

const DAY_OPTIONS = [7, 15, 30, 60, 90];

export default async function ExpiringSoonPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { warehouseId, days } = await loadExpiringSoonSearchParams(searchParams);
  const [rows, warehouses, t] = await Promise.all([
    getExpiringSoon(team.id, days, { warehouseId: warehouseId ?? undefined }),
    getWarehouses(team.id),
    getTranslations('expiringSoon'),
  ]);

  const hrefWith = (params: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    usp.set('days', String(days));
    if (warehouseId) usp.set('warehouseId', String(warehouseId));
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) usp.delete(k);
      else usp.set(k, v);
    }
    return `/dashboard/expiring-soon?${usp.toString()}`;
  };

  const exportQs = new URLSearchParams({
    days: String(days),
    ...(warehouseId ? { warehouseId: String(warehouseId) } : {}),
  }).toString();

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/expiring-soon/export?${exportQs}`} download>
              <Download />
              {t('exportCsv')}
            </a>
          </Button>
        }
      />
      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        {DAY_OPTIONS.map((d) => (
          <Link key={d} href={hrefWith({ days: String(d) })}>
            <Badge variant={days === d ? 'default' : 'outline'} className="cursor-pointer">
              {t('withinDays', { days: d })}
            </Badge>
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
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
      </nav>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { header: t('colSku'), cell: (r) => r.productSku },
          { header: t('colName'), cell: (r) => r.productName },
          { header: t('colWarehouse'), cell: (r) => r.warehouseName },
          { header: t('colBatch'), cell: (r) => r.batchNumber ?? '—' },
          { header: t('colExpiresAt'), cell: (r) => r.expiresAt },
          {
            header: t('colQuantity'),
            className: 'text-right tabular-nums',
            cell: (r) => r.quantity,
          },
        ]}
        empty={<EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />}
      />
    </section>
  );
}
