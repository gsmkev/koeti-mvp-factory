// Page — route /dashboard/clientes/[id]. Estado de cuenta del cliente.
import { notFound } from 'next/navigation';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  Input,
  Label,
  PageHeader,
  StatCard,
  SubmitButton,
} from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getCliente, getPagosForCliente, getVentasForCliente } from '@/lib/db/queries';
import { registrarPago } from './actions';

const money = (n: number) => `₲${n.toLocaleString('es')}`;

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { team } = await requireRole('viewer');
  const { id } = await params;
  const clienteId = Number(id);
  if (!Number.isInteger(clienteId)) notFound();

  const [cliente, t] = await Promise.all([
    getCliente(team.id, clienteId),
    getTranslations('clienteDetail'),
  ]);
  if (!cliente) notFound();

  const [ventasFiado, pagosCliente] = await Promise.all([
    getVentasForCliente(team.id, clienteId),
    getPagosForCliente(team.id, clienteId),
  ]);

  const movements = [
    ...ventasFiado.map((v) => ({
      id: `venta-${v.id}`,
      date: v.createdAt,
      label: t('movVenta'),
      delta: Number(v.total),
    })),
    ...pagosCliente.map((p) => ({
      id: `pago-${p.id}`,
      date: p.createdAt,
      label: p.note || t('movPago'),
      delta: -Number(p.amount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const withRunning = movements.map((m) => {
    running += m.delta;
    return { ...m, running };
  });
  const ledger = [...withRunning].reverse();

  const overLimit =
    Number(cliente.creditLimit) > 0 && Number(cliente.balance) > Number(cliente.creditLimit);

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={cliente.name} description={cliente.phone ?? undefined} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label={t('statBalance')}
          value={money(Number(cliente.balance))}
          hint={overLimit ? t('overLimitHint') : undefined}
        />
        <StatCard
          label={t('statCreditLimit')}
          value={
            Number(cliente.creditLimit) > 0 ? money(Number(cliente.creditLimit)) : t('noLimit')
          }
        />
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>{t('registerPayment')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={registrarPago as (formData: FormData) => void} className="space-y-4">
            <input type="hidden" name="clienteId" value={cliente.id} />
            <div>
              <Label htmlFor="amount" className="mb-2">
                {t('fieldAmount')}
              </Label>
              <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
            </div>
            <div>
              <Label htmlFor="note" className="mb-2">
                {t('fieldNote')}
              </Label>
              <Input id="note" name="note" maxLength={255} />
            </div>
            <SubmitButton pendingText={t('registering')}>{t('registerPayment')}</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('ledgerTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={ledger}
            rowKey={(m) => m.id}
            columns={[
              { header: t('colDate'), cell: (m) => m.date.toLocaleDateString('es') },
              { header: t('colMovement'), cell: (m) => m.label },
              {
                header: t('colAmount'),
                className: 'text-right',
                cell: (m) => (
                  <Badge variant={m.delta > 0 ? 'destructive' : 'secondary'}>
                    {m.delta > 0 ? '+' : ''}
                    {money(m.delta)}
                  </Badge>
                ),
              },
              {
                header: t('colRunning'),
                className: 'text-right',
                cell: (m) => money(m.running),
              },
            ]}
            empty={<EmptyState title={t('emptyTitle')} description={t('emptyDesc')} />}
          />
        </CardContent>
      </Card>
    </section>
  );
}
