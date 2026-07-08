// Page — route /pricing.
import Link from 'next/link';
import { checkoutAction } from '@/lib/payments/actions';
import { ArrowRight, Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { getPagoparPlans } from '@koeti/billing';
import { getTranslations } from 'next-intl/server';
import {
  Badge,
  Button,
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

export default async function PricingPage() {
  const [prices, products, t] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
    getTranslations('pricing'),
  ]);

  const premiumPlan = products.find((product) => product.name === 'Premium');
  const empresarialPlan = products.find((product) => product.name === 'Empresarial');
  const premiumPrice = prices.find((price) => price.productId === premiumPlan?.id);
  const empresarialPrice = prices.find((price) => price.productId === empresarialPlan?.id);

  // Pagopar (Stripe alternative, Paraguay) drives the catalog when Stripe has
  // no key. Prices are whole guaraníes — format with the native Intl API.
  const pagoparPlans = process.env.STRIPE_SECRET_KEY ? [] : getPagoparPlans();
  const pyg = new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' });
  const premiumPagopar = pagoparPlans.find((p) => p.name === 'Premium');
  const empresarialPagopar = pagoparPlans.find((p) => p.name === 'Empresarial');

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('eyebrow')}
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-2xl">{t('freeName')}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t('freeNoSupport')}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">
              {pyg.format(0)}
              <span className="ml-2 text-base font-normal text-muted-foreground">
                {t('perMonth')}
              </span>
            </p>
            <ul className="mt-8 space-y-4 border-t border-border pt-8">
              {(t.raw('freeFeatures') as string[]).map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-foreground" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full rounded-full" asChild>
              <Link href="/sign-up">
                {t('startFree')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <PricingCard
          t={t}
          name={premiumPlan?.name || 'Premium'}
          price={premiumPrice?.unitAmount || 1500}
          priceLabel={premiumPagopar ? pyg.format(premiumPagopar.amount) : undefined}
          interval={premiumPrice?.interval || 'month'}
          trialDays={premiumPagopar ? 0 : premiumPrice?.trialPeriodDays || 7}
          features={t.raw('premiumFeatures') as string[]}
          priceId={premiumPrice?.id}
          highlight
        />
        <PricingCard
          t={t}
          name={empresarialPlan?.name || 'Empresarial'}
          price={empresarialPrice?.unitAmount || 4500}
          priceLabel={empresarialPagopar ? pyg.format(empresarialPagopar.amount) : undefined}
          interval={empresarialPrice?.interval || 'month'}
          trialDays={empresarialPagopar ? 0 : empresarialPrice?.trialPeriodDays || 7}
          features={t.raw('empresarialFeatures') as string[]}
          priceId={empresarialPrice?.id}
        />
      </div>
    </main>
  );
}

function PricingCard({
  t,
  name,
  price,
  priceLabel,
  interval,
  trialDays,
  features,
  priceId,
  highlight = false,
}: {
  t: T;
  name: string;
  price: number;
  priceLabel?: string;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-foreground/30 shadow-md' : undefined}>
      <CardHeader>
        <div>
          <CardTitle className="text-2xl">{name}</CardTitle>
          {trialDays > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('freeTrial', { days: trialDays })}
            </p>
          )}
        </div>
        {highlight && (
          <CardAction>
            <Badge>{t('recommended')}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold text-foreground">
          {priceLabel ?? `$${price / 100}`}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {t('perUser', { interval })}
          </span>
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
        <form action={checkoutAction} className="w-full">
          <input type="hidden" name="priceId" value={priceId} />
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
