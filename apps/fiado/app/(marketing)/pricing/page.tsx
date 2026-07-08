// Page — route /pricing.
import { checkoutFormAction } from '@/lib/payments/actions';
import { ArrowRight, Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  SubmitButton,
} from '@koeti/ui';

type T = Awaited<ReturnType<typeof getTranslations>>;

// Prices are fresh for one hour max
export const revalidate = 3600;

// Fiado bills exclusively in guaraníes via Pagopar (the Stripe alternative
// for Paraguay — see billing.md); there's no USD/Stripe path for this app.
// Parsed straight from PAGOPAR_PLANS (not gated on @koeti/billing's
// pagoparEnabled()) so /pricing shows the real numbers even before
// PAGOPAR_PUBLIC_TOKEN/PAGOPAR_PRIVATE_TOKEN are configured — those two only
// need to exist once someone actually clicks "Empezar".
function getPlans(): { name: string; amount: number }[] {
  return (process.env.PAGOPAR_PLANS ?? 'Básico:50000,Premium:100000')
    .split(',')
    .map((pair) => {
      const [name, amount] = pair.split(':');
      return { name: (name ?? '').trim(), amount: Number(amount) };
    })
    .filter((p) => p.name && Number.isFinite(p.amount) && p.amount > 0);
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const t = await getTranslations('pricing');
  const [basicPlan, premiumPlan] = getPlans();
  const pyg = new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    maximumFractionDigits: 0,
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t('eyebrow')}</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">{t('subtitle')}</p>
        {error === 'unavailable' && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t('checkoutUnavailable')}
          </p>
        )}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <PricingCard
          t={t}
          name={basicPlan?.name ?? 'Básico'}
          priceLabel={pyg.format(basicPlan?.amount ?? 50000)}
          features={t.raw('basicFeatures') as string[]}
        />
        <PricingCard
          t={t}
          name={premiumPlan?.name ?? 'Premium'}
          priceLabel={pyg.format(premiumPlan?.amount ?? 100000)}
          features={t.raw('premiumFeatures') as string[]}
          highlight
        />
      </div>
    </main>
  );
}

function PricingCard({
  t,
  name,
  priceLabel,
  features,
  highlight = false,
}: {
  t: T;
  name: string;
  priceLabel: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-foreground/30 shadow-md' : undefined}>
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        {highlight && (
          <CardAction>
            <Badge>{t('recommended')}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold text-foreground">
          {priceLabel}
          <span className="ml-2 text-base font-normal text-muted-foreground">{t('perMonth')}</span>
        </p>
        <ul className="mt-8 space-y-4 border-t border-border pt-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-foreground" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <form action={checkoutFormAction} className="w-full">
          <input type="hidden" name="plan" value={name} />
          <SubmitButton
            variant="outline"
            className="w-full rounded-full"
            pendingText={t('loading')}
          >
            {t('getStarted')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </SubmitButton>
        </form>
      </CardFooter>
    </Card>
  );
}
