// Page — route /sign-in.
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { googleConfigured } from '@koeti/auth';
import { getUser } from '@/lib/db/queries';
import { Login } from '../login';

export default async function SignInPage() {
  if (await getUser()) redirect('/dashboard');
  return (
    <Suspense>
      <Login mode="signin" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
