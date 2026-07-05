// Page — route /sign-up.
import { Suspense } from 'react';
import { googleConfigured } from '@koeti/auth';
import { Login } from '../login';

export default function SignUpPage() {
  return (
    <Suspense>
      <Login mode="signup" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
