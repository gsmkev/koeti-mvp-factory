'use client';
// Onboarding — one screen: name the workspace, optionally invite teammates.

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Input, Label, SubmitButton } from '@koeti/ui';
import { completeOnboarding } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { APP_NAME } from '@/lib/site';

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const t = useTranslations('onboarding');
  const [state, formAction] = useActionState<ActionState, FormData>(completeOnboarding, {
    error: '',
  });

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground"
            aria-hidden
          >
            {APP_NAME[0]}
          </span>
          <span className="font-display text-lg font-semibold">{APP_NAME}</span>
        </div>

        <h1 className="mt-10 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>

        <form className="mt-8 space-y-5" action={formAction}>
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
          <div>
            <Label htmlFor="invites" className="mb-2">
              {t('invites')}
            </Label>
            <Input id="invites" name="invites" placeholder={t('invitesPlaceholder')} />
            <p className="mt-2 text-xs text-muted-foreground">{t('invitesHelp')}</p>
          </div>
          {state?.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <SubmitButton className="w-full">{t('submit')}</SubmitButton>
        </form>
      </div>
    </div>
  );
}
