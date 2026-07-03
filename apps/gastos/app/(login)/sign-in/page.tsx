import { Suspense } from 'react';
import { googleConfigured } from '@koeti/auth';
import { Login } from '../login';

export default function SignInPage() {
  return (
    <Suspense>
      <Login mode="signin" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
