// Page — route /.
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';

// Card copy is translated (module*Title/Desc); the tag is a code-like label
// left literal on purpose.
const MODULES = [
  { tag: 'auth', key: 'Auth' },
  { tag: 'billing', key: 'Billing' },
  { tag: 'teams', key: 'Teams' },
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

function SchemaDiagram({ yourApp }: { yourApp: string }) {
  return (
    <div className="relative mx-auto w-full max-w-xs font-mono text-sm lg:mx-0">
      <div className="relative pl-6">
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-12 border-l border-dashed border-border"
        />
        {MODULES.map((mod) => (
          <div key={mod.tag} className="relative mb-4 flex items-center">
            <span
              aria-hidden
              className="absolute -left-6 top-1/2 h-px w-6 -translate-y-1/2 bg-border"
            />
            <span className="rounded-md border border-border bg-card px-3 py-1.5 text-foreground">
              {mod.tag}
            </span>
          </div>
        ))}
        <div className="relative mt-2 flex items-center">
          <span
            aria-hidden
            className="absolute -left-6 top-1/2 h-px w-6 -translate-y-1/2 bg-border"
          />
          <span className="rounded-md border border-foreground bg-foreground px-3 py-1.5 text-background">
            {yourApp}
          </span>
        </div>
      </div>
    </div>
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

        <div className="relative mx-auto grid max-w-6xl gap-16 px-6 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {t('eyebrow')}
            </p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
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
          </div>

          <SchemaDiagram yourApp={t('yourApp')} />
        </div>
      </section>

      <section className="border-b border-border py-20">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {MODULES.map((mod) => (
              <Card key={mod.tag}>
                <CardHeader>
                  <span className="font-mono text-xs text-muted-foreground">[{mod.tag}]</span>
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
