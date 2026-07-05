'use client';
// Page — route /dashboard/general.

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@koeti/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { Label, PageHeader, SubmitButton } from '@koeti/ui';
import { updateAccount } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

function AccountForm({ state, nameValue = '', emailValue = '' }: AccountFormProps) {
  const t = useTranslations('account');
  return (
    <>
      <div>
        <Label htmlFor="name" className="mb-2">
          {t('name')}
        </Label>
        <Input
          id="name"
          name="name"
          placeholder={t('namePlaceholder')}
          defaultValue={state.name || nameValue}
          required
        />
      </div>
      <div>
        <Label htmlFor="email" className="mb-2">
          {t('email')}
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t('emailPlaceholder')}
          defaultValue={emailValue}
          required
        />
      </div>
    </>
  );
}

function AccountFormWithData({ state }: { state: ActionState }) {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  return <AccountForm state={state} nameValue={user?.name ?? ''} emailValue={user?.email ?? ''} />;
}

export default function GeneralPage() {
  const t = useTranslations('account');
  const [state, formAction] = useActionState<ActionState, FormData>(updateAccount, {});

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>
            {state.error && <p className="text-destructive text-sm">{state.error}</p>}
            {state.success && <p className="text-success text-sm">{state.success}</p>}
            <SubmitButton pendingText={t('saving')}>{t('save')}</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
