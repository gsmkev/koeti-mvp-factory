'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@koeti/ui';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {t('description')}
        {error.digest && <span className="mt-1 block font-mono text-xs">{t('ref', { digest: error.digest })}</span>}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>{t('tryAgain')}</Button>
        <Button variant="outline" asChild>
          <Link href="/">{t('goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
