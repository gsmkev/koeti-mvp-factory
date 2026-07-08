// Page — route /dashboard/products.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { Badge, ResourcePanel, cn, type ResourceField } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getProductCategories, getProducts, getStockByProduct } from '@/lib/db/queries';
import { planLimitsFor } from '@/lib/plan';
import { ExportCsvButton } from '@/components/export-csv-button';
import { createProduct, deleteProduct, updateProduct } from './actions';
import { loadProductsSearchParams } from './search-params';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { team } = await requireRole('viewer');
  const { csvExport } = planLimitsFor(team);
  const { q, category, active, stockStatus } = await loadProductsSearchParams(searchParams);
  const [allProducts, stockMap, categories, t, tCommon] = await Promise.all([
    getProducts(team.id),
    getStockByProduct(team.id),
    getProductCategories(team.id),
    getTranslations('products'),
    getTranslations('common'),
  ]);

  const enriched = allProducts.map((p) => {
    const stock = stockMap.get(p.id) ?? 0;
    const status =
      stock <= p.minStock ? 'low' : stock > p.minStock * 3 && p.minStock > 0 ? 'excess' : 'normal';
    return { ...p, stock, status };
  });

  const rows = enriched.filter((p) => {
    if (q) {
      const needle = q.toLowerCase();
      const haystack = `${p.sku} ${p.name} ${p.barcode ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    if (category && p.category !== category) return false;
    if (active !== null && p.active !== (active === 'true')) return false;
    if (stockStatus && p.status !== stockStatus) return false;
    return true;
  });

  const money = (n: number) =>
    new Intl.NumberFormat('es', { style: 'currency', currency: team.currency }).format(n);

  const fields = [
    { name: 'sku', label: t('fieldSku'), placeholder: t('skuPlaceholder'), required: true },
    { name: 'name', label: t('fieldName'), required: true },
    { name: 'category', label: t('fieldCategory'), required: true },
    { name: 'unit', label: t('fieldUnit'), placeholder: t('unitPlaceholder'), required: true },
    { name: 'barcode', label: t('fieldBarcode') },
    { name: 'variant', label: t('fieldVariant'), placeholder: t('variantPlaceholder') },
    { name: 'cost', label: t('fieldCost'), type: 'number', step: '0.01', required: true },
    { name: 'price', label: t('fieldPrice'), type: 'number', step: '0.01', required: true },
    {
      name: 'minStock',
      label: t('fieldMinStock'),
      type: 'number',
      defaultValue: '0',
      required: true,
    },
  ] satisfies ResourceField[];

  const statusVariant = (s: string) =>
    s === 'low' ? 'destructive' : s === 'excess' ? 'secondary' : 'outline';

  const hrefWith = (params: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    if (q) usp.set('q', q);
    if (category) usp.set('category', category);
    if (active !== null) usp.set('active', active);
    if (stockStatus) usp.set('stockStatus', stockStatus);
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) usp.delete(k);
      else usp.set(k, v);
    }
    const qs = usp.toString();
    return `/dashboard/products${qs ? `?${qs}` : ''}`;
  };

  const exportParams = new URLSearchParams();
  if (q) exportParams.set('q', q);
  if (category) exportParams.set('category', category);
  const exportQs = exportParams.toString();
  const exportHref = `/api/products/export${exportQs ? `?${exportQs}` : ''}`;

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <nav className="flex flex-wrap items-center gap-2" aria-label={t('filterAria')}>
        <form action="/dashboard/products" className="flex items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder={t('searchPlaceholder')}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none"
          />
          {category && <input type="hidden" name="category" value={category} />}
          {active !== null && <input type="hidden" name="active" value={active} />}
          {stockStatus && <input type="hidden" name="stockStatus" value={stockStatus} />}
        </form>
        <Link href={hrefWith({ category: undefined })}>
          <Badge variant={category ? 'outline' : 'default'} className={cn('cursor-pointer')}>
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
        <span className="mx-1 h-4 w-px bg-border" />
        {(['low', 'normal', 'excess'] as const).map((s) => (
          <Link key={s} href={hrefWith({ stockStatus: stockStatus === s ? undefined : s })}>
            <Badge variant={stockStatus === s ? 'default' : 'outline'} className="cursor-pointer">
              {t(`status.${s}`)}
            </Badge>
          </Link>
        ))}
        <div className="ml-auto">
          <ExportCsvButton
            href={exportHref}
            allowed={csvExport}
            label={t('exportCsv')}
            lockedLabel={tCommon('exportCsvLocked')}
          />
        </div>
      </nav>
      <ResourcePanel
        title={t('panelTitle')}
        description={t('panelDesc')}
        fields={fields}
        onCreate={createProduct}
        createLabel={t('createLabel')}
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
            header: t('colStatus'),
            cell: (p) => <Badge variant={statusVariant(p.status)}>{t(`status.${p.status}`)}</Badge>,
          },
          {
            header: t('colCost'),
            className: 'text-right tabular-nums',
            cell: (p) => money(Number(p.avgCost)),
          },
          {
            header: t('colPrice'),
            className: 'text-right tabular-nums',
            cell: (p) => money(Number(p.price)),
          },
          {
            header: t('colValue'),
            className: 'text-right tabular-nums',
            cell: (p) => money(p.stock * Number(p.avgCost)),
          },
        ]}
        rows={rows}
        rowKey={(p) => p.id}
        onUpdate={updateProduct}
        editLabel={t('editLabel')}
        onDelete={deleteProduct}
        emptyTitle={t('emptyTitle')}
        emptyDescription={t('emptyDesc')}
      />
    </section>
  );
}
