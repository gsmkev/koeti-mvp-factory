'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Label } from '@koeti/ui';
import { Loader2 } from 'lucide-react';
import { forgotPassword, resetPassword } from './actions';
import { ActionState } from '@/lib/auth/middleware';
import { APP_NAME } from '@/lib/site';

function AuthShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-center px-6 py-12 sm:px-12">
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

        <h1 className="mt-10 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>

        {children}
      </div>
    </div>
  );
}

function FormMessages({ state }: { state: ActionState }) {
  return (
    <>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-primary">
          {state.success}
        </p>
      )}
    </>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    forgotPassword,
    { error: '' }
  );

  return (
    <AuthShell
      title="Restablece tu contraseña"
      description="Ingresa el correo de tu cuenta y te enviaremos un enlace para restablecerla."
    >
      <form className="mt-8 space-y-5" action={formAction}>
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            placeholder="tu@empresa.com"
          />
        </div>

        <FormMessages state={state} />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando enlace…
            </>
          ) : (
            'Enviar enlace'
          )}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        ¿La recordaste?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resetPassword,
    { error: '' }
  );

  if (!token) {
    return (
      <AuthShell
        title="Enlace inválido"
        description="A este enlace le falta el token de restablecimiento. Solicita uno nuevo."
      >
        <Button asChild className="mt-8 w-full">
          <Link href="/forgot-password">Solicitar un enlace nuevo</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Elige una contraseña nueva"
      description="Debe tener al menos 8 caracteres."
    >
      <form className="mt-8 space-y-5" action={formAction}>
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña nueva</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={100}
            placeholder="Al menos 8 caracteres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirma la contraseña nueva</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={100}
            placeholder="Repite la contraseña"
          />
        </div>

        <FormMessages state={state} />

        {state?.success ? (
          <Button asChild className="w-full">
            <Link href="/sign-in">Ir a iniciar sesión</Link>
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando…
              </>
            ) : (
              'Actualizar contraseña'
            )}
          </Button>
        )}
      </form>
    </AuthShell>
  );
}
