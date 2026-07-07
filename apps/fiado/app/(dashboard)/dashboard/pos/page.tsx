// Page — route /dashboard/pos. Nueva venta (contado o fiado).
import { PageHeader } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/lib/auth/middleware';
import { getClientes, getProductos } from '@/lib/db/queries';
import { PosCart } from '@/components/pos-cart';

export default async function PosPage() {
  const { team } = await requireRole('member');
  const [productos, clientes, t] = await Promise.all([
    getProductos(team.id),
    getClientes(team.id),
    getTranslations('pos'),
  ]);

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('description')} />
      <PosCart productos={productos} clientes={clientes} />
    </section>
  );
}
