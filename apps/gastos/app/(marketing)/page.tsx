// Page — route /.
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';

// Card tags + copy are translated; the tag is a code-like label.
const MODULES = [
  { key: 'Registro', tagKey: 'moduleRegistroTag' },
  { key: 'Categorias', tagKey: 'moduleCategoriasTag' },
  { key: 'Equipo', tagKey: 'moduleEquipoTag' },
] as const;

type LedgerRow = { cat: string; desc: string; amount: string };

function LedgerPreview({
  thisMonth,
  rows,
  catLabel,
}: {
  thisMonth: string;
  rows: LedgerRow[];
  catLabel: (key: string) => string;
}) {
  return (
    <div className="mx-auto w-full max-w-sm lg:mx-0">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {thisMonth}
          </span>
          <span className="font-display text-sm font-semibold tabular-nums text-success">
            $3,942.50
          </span>
        </div>
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.desc} className="flex items-center gap-3 px-4 py-3">
              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                {catLabel(row.cat)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{row.desc}</span>
              <span className="text-sm font-medium tabular-nums">{row.amount}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations('marketing');
  const tcat = await getTranslations('categories');
  const rows = t.raw('ledgerRows') as LedgerRow[];

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

        <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {t('eyebrow')}
            </p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              {t('title')}
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
          </div>

          <LedgerPreview
            thisMonth={t('ledgerThisMonth')}
            rows={rows}
            catLabel={(key) => tcat(key)}
          />
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {MODULES.map((mod) => (
              <Card key={mod.key}>
                <CardHeader>
                  <span className="font-mono text-xs text-muted-foreground">[{t(mod.tagKey)}]</span>
                  <CardTitle className="text-lg">{t(`module${mod.key}Title`)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t(`module${mod.key}Desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center sm:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t('ctaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">{t('ctaSubtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">{t('createAccount')}</Link>
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
