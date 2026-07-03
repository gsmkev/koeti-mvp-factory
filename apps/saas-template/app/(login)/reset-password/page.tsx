import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '../password';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
