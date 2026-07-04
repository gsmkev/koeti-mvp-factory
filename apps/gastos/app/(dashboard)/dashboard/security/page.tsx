'use client';

import { Input } from '@koeti/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { Label, PageHeader, SubmitButton } from '@koeti/ui';
import { Lock, Trash2 } from 'lucide-react';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updatePassword, deleteAccount } from '@/app/(login)/actions';

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const t = useTranslations('security');
  const [passwordState, passwordAction] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction] = useActionState<DeleteState, FormData>(
    deleteAccount,
    {}
  );

  return (
    <section className="flex-1 space-y-6 p-4 lg:p-8">
      <PageHeader title={t('title')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('passwordCard')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="current-password" className="mb-2">
                {t('currentPassword')}
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.currentPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2">
                {t('newPassword')}
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.newPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2">
                {t('confirmNewPassword')}
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.confirmPassword}
              />
            </div>
            {passwordState.error && (
              <p className="text-destructive text-sm">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-success text-sm">{passwordState.success}</p>
            )}
            <SubmitButton pendingText={t('updating')}>
              <Lock className="mr-2 h-4 w-4" />
              {t('updatePassword')}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('deleteCard')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t('deleteWarning')}
          </p>
          <form action={deleteAction} className="space-y-4">
            <div>
              <Label htmlFor="delete-password" className="mb-2">
                {t('confirmPassword')}
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={deleteState.password}
              />
            </div>
            {deleteState.error && (
              <p className="text-destructive text-sm">{deleteState.error}</p>
            )}
            <SubmitButton
              variant="destructive"
              className="bg-destructive hover:bg-destructive/90"
              pendingText={t('deleting')}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('deleteAccount')}
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
