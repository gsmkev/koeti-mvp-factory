// Page — route /dashboard/ventas. Historial de ventas (solo lectura + export CSV).
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { parseAsInteger, parseAsStringEnum, createLoader } from 'nuqs/server';
import { Badge, Button, DataTable, EmptyState, PageHeader, Pagination, cn } from '@koeti/ui';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getClientes, getVentas, getVentasTotal, VENTAS_PAGE_SIZE } from '@/lib/db/queries';

const money = (n: number) => `₲${n.toLocaleString('es-PY')}`;
const TIPOS = ['contado', 'fiado'] as const;
const now = () => new Date();
const loadSearchParams = createLoader({
  pagina: parseAsInteger.withDefault(1),
  tipo: parseAsStringEnum([...TIPOS]),
  cliente: parseAsInteger,
  mes: parseAsInteger,
  anio: parseAsInteger,
});
const selectClass =
  'h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const params = await loadSearchParams(searchParams);
  const { pagina, tipo, cliente } = params;
  // Filtro de período: mes actual por defecto, ajustable con los desplegables.
  const mes = params.mes ?? now().getMonth() + 1;
  const anio = params.anio ?? now().getFullYear();
  const desde = new Date(anio, mes - 1, 1);
  const hasta = new Date(anio, mes, 1);

  const filters = {
    tipo: tipo ?? undefined,
    clienteId: cliente ?? undefined,
    desde,
    hasta,
  };
  const [fetched, total, clientes, locale, t, tCommon] = await Promise.all([
    getVentas(team.id, pagina, filters),
    getVentasTotal(team.id, filters),
    getClientes(team.id),
    getLocale(),
    getTranslations('ventas'),
    getTranslations('common'),
  ]);
  const hasMore = fetched.length > VENTAS_PAGE_SIZE;
  const rows = fetched.slice(0, VENTAS_PAGE_SIZE);

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1)),
  }));
  const currentYear = now().getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const buildHref = (overrides: { tipo?: string | null; pagina?: number }) => {
    const qp = new URLSearchParams();
    const nextTipo = overrides.tipo !== undefined ? overrides.tipo : tipo;
    if (nextTipo) qp.set('tipo', nextTipo);
    if (cliente) qp.set('cliente', String(cliente));
    qp.set('mes', String(mes));
    qp.set('anio', String(anio));
    const nextPagina = overrides.pagina ?? pagina;
    if (nextPagina > 1) qp.set('pagina', String(nextPagina));
    return `/dashboard/ventas?${qp.toString()}`;
  };

  return (
    <section className="flex-1 space-y-6 px-4 pt-4 pb-28 lg:px-8 lg:pt-8 lg:pb-28">
      <PageHeader title={t('title')} description={t('description')} />
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
        <form
          method="GET"
          action="/dashboard/ventas"
          className="flex flex-wrap items-center gap-2 lg:ml-auto"
        >
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          <select name="mes" defaultValue={mes} className={cn(selectClass, 'capitalize')}>
            {months.map((m) => (
              <option key={m.value} value={m.value} className="capitalize">
                {m.label}
              </option>
            ))}
          </select>
          <select name="anio" defaultValue={anio} className={selectClass}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
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

      {/* Barra de totales — fija al pie de pantalla (arriba de la barra móvil
          en celular, sobre el sidebar en desktop) mientras la tabla se
          desplaza normalmente por encima. */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] lg:bottom-0 lg:left-[15.5rem] lg:px-8">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{t('totalPeriodo')}</span>
          <span className="text-xl font-bold tabular-nums">{money(total)}</span>
        </div>
      </div>
    </section>
  );
}
