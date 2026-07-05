// Page — route /reset-password.
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetPasswordForm } from '../password';

export const metadata: Metadata = { title: 'Elegir contraseña nueva' };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
