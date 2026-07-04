import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@koeti/ui';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="max-w-md space-y-6 text-center">
        <p className="font-mono text-sm text-muted-foreground">{t('code')}</p>
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <Button asChild variant="outline">
          <Link href="/">{t('back')}</Link>
        </Button>
      </div>
    </div>
  );
}
