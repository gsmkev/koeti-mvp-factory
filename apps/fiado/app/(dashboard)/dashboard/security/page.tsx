'use client';
// Page — route /dashboard/security.

import { Input } from '@koeti/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@koeti/ui';
import { Label, PageHeader, SubmitButton } from '@koeti/ui';
import { Lock } from 'lucide-react';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { updatePassword } from '@/app/(login)/actions';

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

// ponytail: no self-service "eliminar cuenta" card — any team member
// (including an employee account the owner created) could delete their own
// login without the owner knowing, which is a worse failure mode here than
// the GDPR-style self-delete this pattern usually serves. An owner removes
// an employee from /dashboard/team instead; the deleteAccount action stays
// wired for a future admin-facing flow if that's ever needed.
export default function SecurityPage() {
  const t = useTranslations('security');
  const [passwordState, passwordAction] = useActionState<PasswordState, FormData>(
    updatePassword,
    {},
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
    </section>
  );
}
