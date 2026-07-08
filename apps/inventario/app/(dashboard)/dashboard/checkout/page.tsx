// Page — route /dashboard/checkout. Pagopar tax-identity step: Paraguayan
// invoicing is mandatory (every sale needs a factura with RUC/CI + razón
// social), so the first paid checkout captures the team's tax data here;
// renewals just confirm the prefill and continue to Pagopar's hosted checkout.
import type { SearchParams } from 'nuqs/server';
import { getTranslations } from 'next-intl/server';
import { CreditCard } from 'lucide-react';
import { getPagoparPlans } from '@koeti/billing';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
  SubmitButton,
} from '@koeti/ui';
import { pagoparCheckoutAction } from '@/lib/payments/actions';
import { getTeamForUser } from '@/lib/db/queries';
import { loadSearchParams } from './search-params';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ plan: planName, error }, team, t] = await Promise.all([
    loadSearchParams(searchParams),
    getTeamForUser(),
    getTranslations('checkout'),
  ]);
  const plan = getPagoparPlans().find((p) => p.name === planName);

  if (!plan || !team) {
    return (
      <section className="flex-1 p-4 lg:p-8">
        <PageHeader title={t('title')} />
        <EmptyState icon={CreditCard} title={t('noPlanTitle')} description={t('noPlanDesc')} />
      </section>
    );
  }

  const amount = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
    plan.amount,
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <PageHeader title={t('title')} description={t('planSummary', { plan: plan.name, amount })} />
      <Card className="mt-6 max-w-lg">
        <CardHeader>
          <CardTitle>{t('billingData')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('invoiceNote')}</p>
        </CardHeader>
        <CardContent>
          <form action={pagoparCheckoutAction} className="space-y-4">
            <input type="hidden" name="plan" value={plan.name} />
            <div>
              <Label htmlFor="taxDocumentType" className="mb-2">
                {t('docType')}
              </Label>
              <select
                id="taxDocumentType"
                name="taxDocumentType"
                defaultValue={team.taxDocumentType}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="CI">{t('docTypeCi')}</option>
                <option value="RUC">{t('docTypeRuc')}</option>
              </select>
            </div>
            <div>
              <Label htmlFor="taxId" className="mb-2">
                {t('taxId')}
              </Label>
              <Input
                id="taxId"
                name="taxId"
                defaultValue={team.taxId ?? ''}
                placeholder={t('taxIdPlaceholder')}
                required
              />
            </div>
            <div>
              <Label htmlFor="businessName" className="mb-2">
                {t('businessName')}
              </Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={team.businessName ?? team.name}
                maxLength={100}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{t('invalid')}</p>}
            <SubmitButton className="w-full" pendingText={t('loading')}>
              {t('pay', { amount })}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
