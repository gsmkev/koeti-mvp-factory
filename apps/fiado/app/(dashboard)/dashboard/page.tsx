// Page — route /dashboard. Resumen del negocio.
import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import {
  BarChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  groupSum,
  PageHeader,
  PrintButton,
  StatCard,
} from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import {
  getClientes,
  getDeudaTotal,
  getVentasStats,
  getVentasUltimaSemana,
} from '@/lib/db/queries';

const money = (n: number) => `₲${n.toLocaleString('es-PY')}`;

export default async function DashboardPage() {
  const { team } = await requireRole('viewer');
  const [deudaTotal, ventasStats, ventasSemana, clientes, t] = await Promise.all([
    getDeudaTotal(team.id),
    getVentasStats(team.id),
    getVentasUltimaSemana(team.id),
    getClientes(team.id),
    getTranslations('overview'),
  ]);

  const clientesConSaldo = clientes.filter((c) => Number(c.balance) > 0);
  const topClientes = [...clientesConSaldo]
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5);

  const byDay = groupSum(
    ventasSemana,
    (v) => v.createdAt.toISOString().slice(0, 10),
    (v) => Number(v.total),
  )
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((d) => ({ ...d, label: d.label.slice(5) })); // MM-DD

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<PrintButton>{t('downloadPdf')}</PrintButton>}
      />

      <Button asChild size="lg" className="h-14 w-full text-lg sm:w-auto">
        <Link href="/dashboard/pos">
          {t('newSale')}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>

      <Card className="bg-primary text-primary-foreground">
        <CardContent className="px-6 py-5">
          <p className="text-sm font-medium uppercase tracking-wide opacity-80">
            {t('statDeudaTotal')}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{money(deudaTotal)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t('statVentasHoy')} value={money(ventasStats.hoy)} />
        <StatCard label={t('statVentasMes')} value={money(ventasStats.mes)} />
        <StatCard label={t('statClientesConSaldo')} value={clientesConSaldo.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('chartVentasSemana')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={byDay} valueFormat={money} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('rankingClientes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={topClientes}
              rowKey={(c) => c.id}
              columns={[
                { header: t('colName'), cell: (c) => c.name },
                {
                  header: t('colBalance'),
                  className: 'text-right',
                  cell: (c) => money(Number(c.balance)),
                },
              ]}
              empty={
                <EmptyState
                  icon={Users}
                  title={t('emptyDeudaTitle')}
                  description={t('emptyDeudaDesc')}
                  className="border-none"
                />
              }
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
