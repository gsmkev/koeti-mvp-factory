'use client';

import { useActionState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, SubmitButton } from '@koeti/ui';
import { useTranslations } from 'next-intl';
import { generateMonthlySummary, type SummaryState } from './actions';

export function AiSummary() {
  const t = useTranslations('gastosAi');
  const [state, formAction] = useActionState<SummaryState, FormData>(
    (_prev, formData) => generateMonthlySummary(formData),
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.summary ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">{state.summary}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        )}
        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        <form action={formAction}>
          <SubmitButton pendingText={t('generating')}>{t('generate')}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
