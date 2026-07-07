// Page — route /dashboard/invoices. Read-only list of the SIFEN facturas
// emitted for this team (written by the sifen-invoice job after each paid
// Pagopar order). The CDC is the legal reference; the PDF/KuDE lives with the
// emission provider (FacturaSend), so there's nothing to mutate here.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { getTranslations } from 'next-intl/server';
import { ReceiptText } from 'lucide-react';
import { Badge, Card, CardContent, DataTable, EmptyState, PageHeader, Pagination } from '@koeti/ui';
import { requireRole } from '@/lib/auth/middleware';
import { INVOICES_PAGE_SIZE, getInvoices } from '@/lib/db/queries';
import { loadSearchParams } from './search-params';

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Fiscal documents are billing data — admins and owners only.
  const { team } = await requireRole('admin');
  const [{ page }, t, tc] = await Promise.all([
    loadSearchParams(searchParams),
    getTranslations('invoices'),
    getTranslations('common'),
  ]);
  const fetched = await getInvoices(team.id, page);
  const hasMore = fetched.length > INVOICES_PAGE_SIZE;
  const rows = fetched.slice(0, INVOICES_PAGE_SIZE);
  const pyg = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });

  return (
    <section className="flex-1 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('description')} />
      <Card className="mt-6">
        <CardContent>
          <DataTable
            columns={[
              {
                header: t('date'),
                cell: (i) => i.createdAt.toLocaleDateString(),
              },
              {
                header: t('number'),
                cell: (i) => <span className="font-mono text-xs">{i.number ?? '—'}</span>,
              },
              {
                header: t('order'),
                cell: (i) => <span className="font-mono text-xs">{i.orderRef}</span>,
              },
              {
                header: 'CDC',
                cell: (i) =>
                  i.cdc ? (
                    <span className="font-mono text-xs" title={i.cdc}>
                      {i.cdc.slice(0, 8)}…{i.cdc.slice(-6)}
                    </span>
                  ) : (
                    '—'
                  ),
              },
              {
                header: t('amount'),
                cell: (i) => pyg.format(i.amount),
                className: 'text-right',
              },
              {
                // Status is provider-supplied (FacturaSend/SIFEN estado) —
                // literal, like Stripe plan names.
                header: t('status'),
                cell: (i) => <Badge variant="secondary">{i.status}</Badge>,
              },
            ]}
            rows={rows}
            rowKey={(i) => i.id}
            empty={
              <EmptyState icon={ReceiptText} title={t('emptyTitle')} description={t('emptyDesc')} />
            }
          />
        </CardContent>
      </Card>
      <Pagination
        className="mt-4"
        page={page}
        hasMore={hasMore}
        hrefFor={(p) => `/dashboard/invoices?page=${p}`}
        linkComponent={Link}
        prevLabel={tc('prevPage')}
        nextLabel={tc('nextPage')}
      />
    </section>
  );
}
