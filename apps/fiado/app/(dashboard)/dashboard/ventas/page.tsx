// Page — route /dashboard/ventas. Historial de ventas (solo lectura + export CSV).
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { parseAsInteger, parseAsStringEnum, createLoader } from 'nuqs/server';
import { Download } from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, PageHeader, Pagination, cn } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getClientes, getVentas, VENTAS_PAGE_SIZE } from '@/lib/db/queries';

const money = (n: number) => `₲${n.toLocaleString('es')}`;
const TIPOS = ['contado', 'fiado'] as const;
const loadSearchParams = createLoader({
  pagina: parseAsInteger.withDefault(1),
  tipo: parseAsStringEnum([...TIPOS]),
  cliente: parseAsInteger,
});
const selectClass =
  'h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { pagina, tipo, cliente } = await loadSearchParams(searchParams);
  const [fetched, clientes, t, tCommon] = await Promise.all([
    getVentas(team.id, pagina, { tipo: tipo ?? undefined, clienteId: cliente ?? undefined }),
    getClientes(team.id),
    getTranslations('ventas'),
    getTranslations('common'),
  ]);
  const hasMore = fetched.length > VENTAS_PAGE_SIZE;
  const rows = fetched.slice(0, VENTAS_PAGE_SIZE);

  const buildHref = (overrides: { tipo?: string | null; pagina?: number }) => {
    const params = new URLSearchParams();
    const nextTipo = overrides.tipo !== undefined ? overrides.tipo : tipo;
    if (nextTipo) params.set('tipo', nextTipo);
    if (cliente) params.set('cliente', String(cliente));
    const nextPagina = overrides.pagina ?? pagina;
    if (nextPagina > 1) params.set('pagina', String(nextPagina));
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
      <nav className="flex flex-wrap items-center gap-2" aria-label={t('filterAria')}>
        <Link href={buildHref({ tipo: null })}>
          <Badge variant={tipo ? 'outline' : 'default'} className={cn('cursor-pointer')}>
            {t('filterAll')}
          </Badge>
        </Link>
        {TIPOS.map((tp) => (
          <Link key={tp} href={buildHref({ tipo: tp })}>
            <Badge variant={tipo === tp ? 'default' : 'outline'} className="cursor-pointer">
              {tp === 'fiado' ? t('fiado') : t('contado')}
            </Badge>
          </Link>
        ))}
        <form method="GET" action="/dashboard/ventas" className="ml-auto flex items-center gap-2">
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <select name="cliente" defaultValue={cliente ?? ''} className={selectClass}>
            <option value="">{t('filterAllClients')}</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            {t('filterApply')}
          </Button>
        </form>
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
        hrefFor={(p) => buildHref({ pagina: p })}
        linkComponent={Link}
        prevLabel={tCommon('prevPage')}
        nextLabel={tCommon('nextPage')}
      />
    </section>
  );
}
