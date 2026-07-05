// @koeti/email — password reset.
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';
import { defaultLocale, type Locale } from '@koeti/i18n/config';

const copy = {
  en: {
    preview: 'Reset your password',
    heading: 'Reset your password',
    body: 'Click the link below to reset your password. This link expires in 1 hour.',
    cta: 'Reset password',
    subject: 'Reset your {app} password',
  },
  es: {
    preview: 'Restablecé tu contraseña',
    heading: 'Restablecé tu contraseña',
    body: 'Hacé clic en el enlace de abajo para restablecer tu contraseña. Este enlace expira en 1 hora.',
    cta: 'Restablecer contraseña',
    subject: 'Restablecé tu contraseña de {app}',
  },
  pt: {
    preview: 'Redefina sua senha',
    heading: 'Redefina sua senha',
    body: 'Clique no link abaixo para redefinir sua senha. Este link expira em 1 hora.',
    cta: 'Redefinir senha',
    subject: 'Redefina sua senha do {app}',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export function passwordResetSubject(app: string, locale: Locale = defaultLocale) {
  return copy[locale].subject.replace('{app}', app);
}

interface PasswordResetEmailProps {
  resetLink: string;
  locale?: Locale;
}

export function PasswordResetEmail({ resetLink, locale = defaultLocale }: PasswordResetEmailProps) {
  const c = copy[locale];
  return (
    <Html>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>{c.heading}</Heading>
          <Text>{c.body}</Text>
          <Link href={resetLink}>{c.cta}</Link>
        </Container>
      </Body>
    </Html>
  );
}
