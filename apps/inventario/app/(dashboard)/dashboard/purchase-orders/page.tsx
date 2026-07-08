// Page — route /dashboard/purchase-orders. Custom page (not ResourcePanel):
// besides create, each row needs approve/receive-with-qty/cancel actions —
// state transitions, not a generic edit dialog.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { Download } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  EmptyState,
  Label,
  PageHeader,
  SubmitButton,
} from '@koeti/ui';
import { roleAtLeast } from '@koeti/auth';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { PURCHASE_ORDER_STATUSES } from '@/lib/db/schema';
import { getProducts, getPurchaseOrders, getSuppliers, getWarehouses } from '@/lib/db/queries';
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
} from './actions';
import { loadPurchaseOrdersSearchParams } from './search-params';

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team, role } = await requireRole('viewer');
  const { supplierId, status, from, to } = await loadPurchaseOrdersSearchParams(searchParams);
  const [suppliers, products, warehouses, orders, t, tStatus] = await Promise.all([
    getSuppliers(team.id),
    getProducts(team.id),
    getWarehouses(team.id),
    getPurchaseOrders(team.id, {
      supplierId: supplierId ?? undefined,
      status: status ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
    }),
    getTranslations('purchaseOrders'),
    getTranslations('purchaseOrderStatuses'),
  ]);
  const isAdmin = roleAtLeast(role, 'admin');

  const money = (n: number) =>
    new Intl.NumberFormat('es', { style: 'currency', currency: team.currency }).format(n);

  const statusVariant = (s: string) =>
    s === 'cancelled'
      ? 'destructive'
      : s === 'received'
        ? 'default'
        : s === 'draft'
          ? 'outline'
          : 'secondary';

  const exportParams = new URLSearchParams();
  if (supplierId) exportParams.set('supplierId', String(supplierId));
  if (status) exportParams.set('status', status);
  if (from) exportParams.set('from', from);
  if (to) exportParams.set('to', to);
  const exportQs = exportParams.toString();

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/purchase-orders/export${exportQs ? `?${exportQs}` : ''}`} download>
              <Download />
              {t('exportCsv')}
            </a>
          </Button>
        }
      />

      <Card>
        <CardContent>
          <form
            action={createPurchaseOrder as (formData: FormData) => void}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="grid min-w-40 flex-1 gap-1.5">
              <Label htmlFor="po-supplierId">{t('fieldSupplier')}</Label>
              <select
                id="po-supplierId"
                name="supplierId"
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid min-w-40 flex-1 gap-1.5">
              <Label htmlFor="po-productId">{t('fieldProduct')}</Label>
              <select
                id="po-productId"
                name="productId"
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid min-w-40 flex-1 gap-1.5">
              <Label htmlFor="po-warehouseId">{t('fieldWarehouse')}</Label>
              <select
                id="po-warehouseId"
                name="warehouseId"
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid w-full gap-1.5 sm:w-28">
              <Label htmlFor="po-orderedQty">{t('fieldOrderedQty')}</Label>
              <input
                id="po-orderedQty"
                name="orderedQty"
                type="number"
                min={1}
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
              />
            </div>
            <div className="grid w-full gap-1.5 sm:w-32">
              <Label htmlFor="po-unitCost">{t('fieldUnitCost')}</Label>
              <input
                id="po-unitCost"
                name="unitCost"
                type="number"
                step="0.01"
                min={0}
                required
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
              />
            </div>
            <div className="grid w-full gap-1.5 sm:w-40">
              <Label htmlFor="po-expectedDate">{t('fieldExpectedDate')}</Label>
              <input
                id="po-expectedDate"
                name="expectedDate"
                type="date"
                className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
              />
            </div>
            <SubmitButton>{t('createLabel')}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <nav className="flex flex-wrap gap-2" aria-label={t('filterAria')}>
        <Link href="/dashboard/purchase-orders">
          <Badge variant={!status ? 'default' : 'outline'} className="cursor-pointer">
            {t('filterAll')}
          </Badge>
        </Link>
        {PURCHASE_ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/dashboard/purchase-orders?status=${s}`}>
            <Badge variant={status === s ? 'default' : 'outline'} className="cursor-pointer">
              {tStatus(s)}
            </Badge>
          </Link>
        ))}
      </nav>

      <DataTable
        rows={orders}
        rowKey={(o) => o.id}
        columns={[
          { header: t('colSupplier'), cell: (o) => o.supplierName },
          { header: t('colProduct'), cell: (o) => o.productName },
          { header: t('colWarehouse'), cell: (o) => o.warehouseName },
          {
            header: t('colQty'),
            className: 'text-right tabular-nums',
            cell: (o) => `${o.receivedQty} / ${o.orderedQty}`,
          },
          {
            header: t('colUnitCost'),
            className: 'text-right tabular-nums',
            cell: (o) => money(Number(o.unitCost)),
          },
          { header: t('colExpectedDate'), cell: (o) => o.expectedDate ?? '—' },
          {
            header: t('colStatus'),
            cell: (o) => <Badge variant={statusVariant(o.status)}>{tStatus(o.status)}</Badge>,
          },
          ...(isAdmin
            ? [
                {
                  header: '',
                  className: 'text-right',
                  cell: (o: (typeof orders)[number]) => (
                    <div className="flex justify-end gap-2">
                      {o.status === 'draft' && (
                        <form action={approvePurchaseOrder as (formData: FormData) => void}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton size="sm" variant="outline">
                            {t('approveLabel')}
                          </SubmitButton>
                        </form>
                      )}
                      {(o.status === 'approved' || o.status === 'partial') && (
                        <form
                          action={receivePurchaseOrder as (formData: FormData) => void}
                          className="flex items-center gap-1"
                        >
                          <input type="hidden" name="id" value={o.id} />
                          <input
                            name="qty"
                            type="number"
                            min={1}
                            max={o.orderedQty - o.receivedQty}
                            defaultValue={o.orderedQty - o.receivedQty}
                            className="border-input h-9 w-20 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none"
                          />
                          <SubmitButton size="sm">{t('receiveLabel')}</SubmitButton>
                        </form>
                      )}
                      {(o.status === 'draft' ||
                        o.status === 'approved' ||
                        o.status === 'partial') && (
                        <form action={cancelPurchaseOrder as (formData: FormData) => void}>
                          <input type="hidden" name="id" value={o.id} />
                          <SubmitButton size="sm" variant="ghost">
                            {t('cancelLabel')}
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
        empty={<EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />}
      />
    </section>
  );
}
