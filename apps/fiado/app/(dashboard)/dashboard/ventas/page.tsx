// Page — route /dashboard/ventas. Historial de ventas (solo lectura + export CSV).
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { parseAsInteger, parseAsStringEnum, createLoader } from 'nuqs/server';
import { Download } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, PageHeader, Pagination, cn } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getVentas, VENTAS_PAGE_SIZE } from '@/lib/db/queries';

const money = (n: number) => `₲${n.toLocaleString('es')}`;
const TIPOS = ['contado', 'fiado'] as const;
const loadSearchParams = createLoader({
  pagina: parseAsInteger.withDefault(1),
  tipo: parseAsStringEnum([...TIPOS]),
});

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { pagina, tipo } = await loadSearchParams(searchParams);
  const [fetched, t, tCommon] = await Promise.all([
    getVentas(team.id, pagina, tipo ?? undefined),
    getTranslations('ventas'),
    getTranslations('common'),
  ]);
  const hasMore = fetched.length > VENTAS_PAGE_SIZE;
  const rows = fetched.slice(0, VENTAS_PAGE_SIZE);
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (tipo) params.set('tipo', tipo);
    if (p > 1) params.set('pagina', String(p));
    const qs = params.toString();
    return `/dashboard/ventas${qs ? `?${qs}` : ''}`;
  };

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/pagos/export" download>
                <Download />
                {t('exportPagosCsv')}
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="/api/ventas/export" download>
                <Download />
                {t('exportCsv')}
              </a>
            </Button>
          </>
        }
      />
      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        <Link href="/dashboard/ventas">
          <Badge variant={tipo ? 'outline' : 'default'} className={cn('cursor-pointer')}>
            {t('filterAll')}
          </Badge>
        </Link>
        {TIPOS.map((tp) => (
          <Link key={tp} href={`/dashboard/ventas?tipo=${tp}`}>
            <Badge variant={tipo === tp ? 'default' : 'outline'} className="cursor-pointer">
              {tp === 'fiado' ? t('fiado') : t('contado')}
            </Badge>
          </Link>
        ))}
      </nav>
      <DataTable
        rows={rows}
        rowKey={(v) => v.id}
        columns={[
          { header: t('colDate'), cell: (v) => v.createdAt.toLocaleString('es') },
          { header: t('colClient'), cell: (v) => v.clienteName ?? t('noClient') },
          {
            header: t('colType'),
            cell: (v) => (
              <Badge variant={v.paymentType === 'fiado' ? 'destructive' : 'secondary'}>
                {v.paymentType === 'fiado' ? t('fiado') : t('contado')}
              </Badge>
            ),
          },
          { header: t('colTotal'), className: 'text-right', cell: (v) => money(Number(v.total)) },
        ]}
        empty={<EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />}
      />
      <Pagination
        page={pagina}
        hasMore={hasMore}
        hrefFor={hrefFor}
        linkComponent={Link}
        prevLabel={tCommon('prevPage')}
        nextLabel={tCommon('nextPage')}
      />
    </section>
  );
}
