// Page — route /.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Package, ShoppingCart, Users } from 'lucide-react';
import { Button, Card, CardContent } from '@koeti/ui';
import { getTranslations } from 'next-intl/server';
import { getUser } from '@/lib/db/queries';

const STEPS = [
  { icon: Package, key: 'Vender' },
  { icon: ShoppingCart, key: 'Fiado' },
  { icon: Users, key: 'Clientes' },
] as const;

export default async function HomePage() {
  if (await getUser()) redirect('/dashboard');
  const t = await getTranslations('marketing');
  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center sm:px-8 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {t('titleLine1')}
            <br />
            {t('titleLine2')}
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-muted-foreground">{t('subtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">{t('getStarted')}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">{t('viewPricing')}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-5xl px-6 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, key }) => (
              <Card key={key}>
                <CardContent className="flex flex-col items-center gap-3 px-6 py-8 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="text-lg font-semibold text-foreground">{t(`step${key}Title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`step${key}Desc`)}</p>
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
