'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@koeti/ui';
import { Loader2 } from 'lucide-react';
import { signIn, signUp } from './actions';
import { ActionState } from '@/lib/auth/middleware';

import { APP_NAME } from '@/lib/site';

export function Login({
  mode = 'signin',
  googleEnabled = false,
}: {
  mode?: 'signin' | 'signup';
  googleEnabled?: boolean;
}) {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  const oauthError = searchParams.get('error') === 'oauth';
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
            {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === 'signin' ? t('signInSubtitle') : t('signUpSubtitle')}
          </p>

          {oauthError && (
            <p role="alert" className="mt-6 text-sm text-destructive">
              {t('oauthError')}
            </p>
          )}

          {googleEnabled && (
            <>
              <Button asChild variant="outline" className="mt-8 w-full">
                <a href="/api/auth/google">
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  {t('googleContinue')}
                </a>
              </Button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {t('or')}
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form className={`${googleEnabled ? '' : 'mt-8 '}space-y-5`} action={formAction}>
            <input type="hidden" name="redirect" value={redirect || ''} />
            <input type="hidden" name="priceId" value={priceId || ''} />
            <input type="hidden" name="inviteId" value={inviteId || ''} />

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={state.email}
                required
                maxLength={50}
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                {mode === 'signin' && (
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t('forgotPassword')}
                  </Link>
                )}
              </div>
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
                placeholder={
                  mode === 'signin'
                    ? t('passwordPlaceholderSignIn')
                    : t('passwordPlaceholderSignUp')
                }
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
                  {mode === 'signin' ? t('signingIn') : t('creatingAccount')}
                </>
              ) : mode === 'signin' ? (
                t('signInCta')
              ) : (
                t('signUpCta')
              )}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            {mode === 'signin' ? t('newHere') : t('alreadyHave')}{' '}
            <Link
              href={`${mode === 'signin' ? '/sign-up' : '/sign-in'}${
                redirect ? `?redirect=${redirect}` : ''
              }${priceId ? `&priceId=${priceId}` : ''}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {mode === 'signin' ? t('createAccountLink') : t('signInLink')}
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
            {t('brandQuote')}
          </p>
          <footer className="mt-4 text-sm text-sidebar-foreground/70">
            {t('brandFooter', { app: APP_NAME })}
          </footer>
        </blockquote>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
      />
    </svg>
  );
}
