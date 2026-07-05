// Page — route /forgot-password.
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../password';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
