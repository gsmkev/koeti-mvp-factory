'use client';
// Soft email-verification prompt shown in the dashboard until the address is
// confirmed. Verification is a signal, not a gate (emails are a no-op without
// RESEND_API_KEY, so blocking access would lock out un-configured deploys).
import { SubmitButton } from '@koeti/ui';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { resendVerification } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';

type ActionState = { error?: string; success?: string };
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function VerifyEmailBanner() {
  const t = useTranslations('verifyBanner');
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const [state, action] = useActionState<ActionState, FormData>(resendVerification, {});

  if (!user || user.emailVerified) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted px-4 py-2.5 text-sm lg:px-8">
      <p className="text-foreground">{state.success ? t('sent') : t('message')}</p>
      {!state.success && (
        <form action={action}>
          <SubmitButton variant="outline" size="sm" pendingText={t('resending')}>
            {t('resend')}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
