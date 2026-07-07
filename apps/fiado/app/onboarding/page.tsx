// Page — route /onboarding: first-run tenant wizard (workspace → locale →
// plan). Step lives in the URL (?step=…) so every step is deep-linkable and
// the whole wizard is server-rendered — each form posts a server action that
// saves and redirects to the next step. Idempotent: it always renders, and
// re-submitting just re-saves; the (dashboard) layout is what routes
// un-onboarded owners here.
import Link from 'next/link';
import type { SearchParams } from 'nuqs/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft } from 'lucide-react';
import { Input, Label, SubmitButton, cn } from '@koeti/ui';
import { locales, localeNames } from '@koeti/i18n';
import { requireRole } from '@/lib/auth/middleware';
import { getStripePrices, getStripeProducts } from '@/lib/payments/stripe';
import { APP_NAME } from '@/lib/site';
import { completeOnboarding, saveLocale, saveWorkspace } from './actions';
import { STEPS, loadSearchParams, type Step } from './config';

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [{ team }, { step }, t, locale] = await Promise.all([
    requireRole('viewer'),
    loadSearchParams(searchParams),
    getTranslations('onboarding'),
    getLocale(),
  ]);

  const stepIndex = STEPS.indexOf(step);
  const stepLabels: Record<Step, string> = {
    workspace: t('stepWorkspace'),
    locale: t('stepLocale'),
    plan: t('stepPlan'),
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground"
            aria-hidden
          >
            {APP_NAME[0]}
          </span>
          <span className="font-display text-lg font-semibold">{APP_NAME}</span>
        </div>

        {/* Progress: step counter + labelled dots */}
        <p className="mt-10 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('stepOf', { current: stepIndex + 1, total: STEPS.length })}
        </p>
        <ol
          className="mt-3 flex gap-2"
          aria-label={t('stepOf', { current: stepIndex + 1, total: STEPS.length })}
        >
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <span
                className={cn(
                  'block h-1 rounded-full',
                  i <= stepIndex ? 'bg-primary' : 'bg-border',
                )}
              />
              <span
                className={cn(
                  'mt-1.5 block text-xs',
                  i === stepIndex ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {stepLabels[s]}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          {step === 'workspace' && <WorkspaceStep t={t} defaultName={team.name} />}
          {step === 'locale' && <LocaleStep t={t} locale={locale} />}
          {step === 'plan' && <PlanStep t={t} locale={locale} />}
        </div>
      </div>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations>>;

function StepHeader({
  t,
  title,
  subtitle,
  back,
}: {
  t: T;
  title: string;
  subtitle: string;
  back?: Step;
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      {back && (
        <Link
          href={`/onboarding?step=${back}`}
          className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {t('back')}
        </Link>
      )}
    </>
  );
}

function WorkspaceStep({ t, defaultName }: { t: T; defaultName: string }) {
  return (
    <>
      <StepHeader t={t} title={t('workspaceTitle')} subtitle={t('workspaceSubtitle')} />
      <form className="mt-6 space-y-5" action={saveWorkspace}>
        <div>
          <Label htmlFor="name" className="mb-2">
            {t('teamName')}
          </Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultName}
            placeholder={t('teamNamePlaceholder')}
            maxLength={100}
            required
          />
        </div>
        <SubmitButton className="w-full">{t('next')}</SubmitButton>
      </form>
    </>
  );
}

function LocaleStep({ t, locale }: { t: T; locale: string }) {
  return (
    <>
      <StepHeader t={t} title={t('localeTitle')} subtitle={t('localeSubtitle')} back="workspace" />
      <form className="mt-6 space-y-5" action={saveLocale}>
        <div>
          <Label htmlFor="locale" className="mb-2">
            {t('language')}
          </Label>
          <select id="locale" name="locale" defaultValue={locale} className={selectClass}>
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton className="w-full">{t('next')}</SubmitButton>
      </form>
    </>
  );
}

async function PlanStep({ t, locale }: { t: T; locale: string }) {
  // Empty catalog without a Stripe key (dev/CI) → only the free option renders.
  const [prices, products] = await Promise.all([getStripePrices(), getStripeProducts()]);
  const plans = products.flatMap((product) => {
    const price = prices.find((p) => p.productId === product.id);
    return price ? [{ product, price }] : [];
  });

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 100);

  const radioRow =
    'flex cursor-pointer items-center gap-3 rounded-md border border-border p-4 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary';

  return (
    <>
      <StepHeader t={t} title={t('planTitle')} subtitle={t('planSubtitle')} back="locale" />
      <form className="mt-6 space-y-5" action={completeOnboarding}>
        <div className="space-y-3">
          <label className={radioRow}>
            <input type="radio" name="priceId" value="" defaultChecked className="accent-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{t('planFree')}</span>
              <span className="block text-xs text-muted-foreground">{t('planFreeDesc')}</span>
            </span>
          </label>
          {plans.map(({ product, price }) => (
            <label key={product.id} className={radioRow}>
              <input type="radio" name="priceId" value={price.id} className="accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{product.name}</span>
                {price.trialPeriodDays ? (
                  <span className="block text-xs text-muted-foreground">
                    {t('trialDays', { days: price.trialPeriodDays })}
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-medium">
                {money(price.unitAmount ?? 0, price.currency ?? 'usd')}
                <span className="text-xs font-normal text-muted-foreground">
                  /{price.interval === 'year' ? t('intervalYear') : t('intervalMonth')}
                </span>
              </span>
            </label>
          ))}
        </div>
        <SubmitButton className="w-full">{t('finish')}</SubmitButton>
      </form>
    </>
  );
}
