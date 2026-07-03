'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Label } from '@koeti/ui';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

import { APP_NAME } from '@/lib/site';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Form panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex size-8 items-center justify-center rounded-md bg-primary font-display text-base font-bold text-primary-foreground"
              aria-hidden
            >
              {APP_NAME[0]}
            </span>
            <span className="font-display text-lg font-semibold">{APP_NAME}</span>
          </Link>

          <h1 className="mt-10 text-2xl font-semibold tracking-tight">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signin'
              ? 'Welcome back. Enter your details to continue.'
              : 'Start with your work email and a password.'}
          </p>

          <form className="mt-8 space-y-5" action={formAction}>
            <input type="hidden" name="redirect" value={redirect || ''} />
            <input type="hidden" name="priceId" value={priceId || ''} />
            <input type="hidden" name="inviteId" value={inviteId || ''} />

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                maxLength={50}
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === 'signin' ? 'current-password' : 'new-password'
                }
                defaultValue={state.password}
                required
                minLength={8}
                maxLength={100}
                placeholder={mode === 'signin' ? 'Your password' : 'At least 8 characters'}
              />
            </div>

            {state?.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
            <Link
              href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                redirect ? `?redirect=${redirect}` : ''
              }${priceId ? `&priceId=${priceId}` : ''}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {mode === 'signin' ? 'Create an account' : 'Sign in'}
            </Link>
          </p>
        </div>
      </div>

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.25] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--sidebar-border) 1px, transparent 1px), linear-gradient(to bottom, var(--sidebar-border) 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />
        <div className="relative" />
        <blockquote className="relative max-w-md">
          <p className="font-display text-2xl font-medium leading-snug text-sidebar-primary">
            Ship the boring part once — auth, billing, and teams are already
            wired in.
          </p>
          <footer className="mt-4 text-sm text-sidebar-foreground/70">
            {APP_NAME} · SaaS starter
          </footer>
        </blockquote>
      </div>
    </div>
  );
}
