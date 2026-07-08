// Page — route /.
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Truck,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';

// Card copy is translated (feature*Title/Desc); the icon is purely decorative.
const FEATURES = [
  { icon: WarehouseIcon, key: 'Warehouses' },
  { icon: ClipboardList, key: 'Ledger' },
  { icon: AlertTriangle, key: 'Alerts' },
  { icon: Truck, key: 'Purchasing' },
  { icon: BarChart3, key: 'Reports' },
  { icon: ShieldCheck, key: 'Roles' },
] as const;

const PREVIEW_ROWS = [
  { name: 'Detergente 900ml', low: true },
  { name: 'Leche Entera 1L', low: false },
  { name: 'Cable USB-C', low: true },
] as const;

function CornerMark({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute font-mono text-xs text-muted-foreground/50 ${className}`}
    >
      +
    </span>
  );
}

// A static, illustrative preview of the actual product (KPI tiles + a
// low-stock/expiring alert list) — not live data, just the value prop made
// visible instead of described in a paragraph.
function ProductPreview({ t }: { t: Awaited<ReturnType<typeof getTranslations<'marketing'>>> }) {
  return (
    <Card className="w-full max-w-md overflow-hidden py-0 shadow-lg">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-destructive/70" aria-hidden />
        <span className="size-2.5 rounded-full bg-chart-3/70" aria-hidden />
        <span className="size-2.5 rounded-full bg-success/70" aria-hidden />
        <span className="ml-2 font-mono text-xs text-muted-foreground">
          {t('previewWarehouse')}
        </span>
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('previewValue')}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">$48.320</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('previewProducts')}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">312</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t('previewAlertsTitle')}</p>
          {PREVIEW_ROWS.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="truncate text-foreground">{row.name}</span>
              <Badge variant={row.low ? 'destructive' : 'secondary'} className="shrink-0">
                {row.low ? t('previewLow') : t('previewExpiring')}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  const t = await getTranslations('marketing');
  return (
    <main>
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.4] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <CornerMark className="left-4 top-4 sm:left-6 sm:top-6" />
        <CornerMark className="right-4 top-4 sm:right-6 sm:top-6" />
        <CornerMark className="left-4 bottom-4 sm:left-6 sm:bottom-6" />
        <CornerMark className="right-4 bottom-4 sm:right-6 sm:bottom-6" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {t('eyebrow')}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('titleLine1')}
              <br />
              {t('titleLine2')}
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">{t('subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/sign-up">{t('getStarted')}</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/pricing">{t('viewPricing')}</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('trustLine')}</p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <ProductPreview t={t} />
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t('featuresTitle')}
            </h2>
            <p className="mt-3 text-muted-foreground">{t('featuresSubtitle')}</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, key }) => (
              <Card key={key}>
                <CardHeader>
                  <Icon className="size-5 text-primary" aria-hidden />
                  <CardTitle className="mt-2 text-lg">{t(`feature${key}Title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(`feature${key}Desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6 text-center sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">{t('ctaSubtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">
                {t('createAccount')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t('alreadySignIn')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
