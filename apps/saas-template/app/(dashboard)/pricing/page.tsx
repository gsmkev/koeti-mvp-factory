import { checkoutAction } from '@/lib/payments/actions';
import { Check } from 'lucide-react';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import {
  Badge,
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@koeti/ui';
import { SubmitButton } from './submit-button';

// Prices are fresh for one hour max
export const revalidate = 3600;

export default async function PricingPage() {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const basePlan = products.find((product) => product.name === 'Base');
  const plusPlan = products.find((product) => product.name === 'Plus');

  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8 sm:py-20">
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Scaffold // 02
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          One foundation. Pick your plan.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Every plan ships with the full scaffold — auth, billing, and team
          accounts included. Plus adds priority support and early access as
          your team grows.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <PricingCard
          name={basePlan?.name || 'Base'}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || 'month'}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={[
            'Unlimited usage',
            'Unlimited workspace members',
            'Email support',
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || 'Plus'}
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || 'month'}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={[
            'Everything in Base, and:',
            'Early access to new features',
            '24/7 support + Slack access',
          ]}
          priceId={plusPrice?.id}
          highlight
        />
      </div>
    </main>
  );
}

function PricingCard({
  name,
  price,
  interval,
  trialDays,
  features,
  priceId,
  highlight = false,
}: {
  name: string;
  price: number;
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
          <span className="font-mono text-xs text-muted-foreground">
            [{name.toLowerCase()}]
          </span>
          <CardTitle className="mt-1 text-2xl">{name}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {trialDays}-day free trial
          </p>
        </div>
        {highlight && (
          <CardAction>
            <Badge>Recommended</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold text-foreground">
          ${price / 100}
          <span className="ml-2 text-base font-normal text-muted-foreground">
            per user / {interval}
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
          <SubmitButton />
        </form>
      </CardFooter>
    </Card>
  );
}
