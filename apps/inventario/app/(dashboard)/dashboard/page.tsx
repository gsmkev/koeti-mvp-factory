// Page — route /dashboard. The inventory overview report.
import Link from 'next/link';
import { ArrowRight, Boxes, PackageX } from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  DonutChart,
  EmptyState,
  PageHeader,
  PrintButton,
  StatCard,
  groupSum,
  topN,
} from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import {
  getExpiringSoon,
  getLowStockProducts,
  getProducts,
  getStockByProduct,
  getTeamForUser,
  getTopProducts,
} from '@/lib/db/queries';

export default async function DashboardOverviewPage() {
  const team = await getTeamForUser();
  if (!team) throw new Error('Team not found');
  const money = (n: number) =>
    new Intl.NumberFormat('es', { style: 'currency', currency: team.currency }).format(n);

  const [allProducts, stockMap, lowStock, expiring, topProducts, t] = await Promise.all([
    getProducts(team.id, { active: true }),
    getStockByProduct(team.id),
    getLowStockProducts(team.id),
    getExpiringSoon(team.id, 30),
    getTopProducts(team.id, 'best', 5),
    getTranslations('overview'),
  ]);

  const enriched = allProducts.map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }));
  const totalValue = enriched.reduce((sum, p) => sum + p.stock * Number(p.avgCost), 0);

  const byCategory = topN(
    groupSum(
      enriched,
      (p) => p.category,
      (p) => p.stock * Number(p.avgCost),
    ),
    5,
    t('otherCategory'),
  );
  const bySales = topProducts.map((p) => ({ label: p.productName, value: p.qty }));

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <PrintButton>{t('downloadPdf')}</PrintButton>
            <Button asChild>
              <Link href="/dashboard/stock-movements">
                {t('registerMovement')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('statTotalValue')} value={money(totalValue)} />
        <StatCard label={t('statTotalProducts')} value={enriched.length} />
        <StatCard label={t('statLowStock')} value={lowStock.length} hint={t('hintLowStock')} />
        <StatCard
          label={t('statExpiringSoon')}
          value={expiring.length}
          hint={t('hintExpiringSoon')}
        />
      </div>

      {enriched.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t('chartTopSellers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {bySales.length > 0 ? (
                <BarChart data={bySales} />
              ) : (
                <EmptyState
                  title={t('noSalesTitle')}
                  description={t('noSalesDesc')}
                  className="border-none"
                />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('chartByCategory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={byCategory} valueFormat={money} centerLabel={t('centerTotal')} />
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('lowStockTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={lowStock.slice(0, 5)}
            rowKey={(p) => p.id}
            columns={[
              { header: t('colSku'), cell: (p) => p.sku },
              { header: t('colName'), cell: (p) => p.name },
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
            empty={
              <EmptyState
                icon={Boxes}
                title={t('noLowStockTitle')}
                description={t('noLowStockDesc')}
                className="border-none"
              />
            }
          />
          {lowStock.length > 5 && (
            <div className="mt-3 text-right">
              <Button variant="link" size="sm" asChild>
                <Link href="/dashboard/low-stock">
                  {t('viewAllLowStock')}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {expiring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('expiringTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={expiring.slice(0, 5)}
              rowKey={(r) => r.id}
              columns={[
                { header: t('colSku'), cell: (r) => r.productSku },
                { header: t('colName'), cell: (r) => r.productName },
                { header: t('colExpiresAt'), cell: (r) => r.expiresAt },
                {
                  header: t('colQuantity'),
                  className: 'text-right tabular-nums',
                  cell: (r) => r.quantity,
                },
              ]}
              empty={
                <EmptyState icon={PackageX} title={t('noExpiringTitle')} className="border-none" />
              }
            />
            <div className="mt-3 text-right">
              <Button variant="link" size="sm" asChild>
                <Link href="/dashboard/expiring-soon">
                  {t('viewAllExpiring')}
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
