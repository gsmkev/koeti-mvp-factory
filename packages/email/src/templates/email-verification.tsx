// @koeti/email — email verification.
import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components';
import { defaultLocale, type Locale } from '@koeti/i18n/config';

const copy = {
  en: {
    preview: 'Verify your email',
    heading: 'Verify your email',
    body: 'Confirm this address to secure your account. This link expires in 24 hours.',
    cta: 'Verify email',
    subject: 'Verify your {app} email',
  },
  es: {
    preview: 'Verificá tu email',
    heading: 'Verificá tu email',
    body: 'Confirmá esta dirección para asegurar tu cuenta. Este enlace expira en 24 horas.',
    cta: 'Verificar email',
    subject: 'Verificá tu email de {app}',
  },
  pt: {
    preview: 'Verifique seu email',
    heading: 'Verifique seu email',
    body: 'Confirme este endereço para proteger sua conta. Este link expira em 24 horas.',
    cta: 'Verificar email',
    subject: 'Verifique seu email do {app}',
  },
} as const satisfies Record<Locale, Record<string, string>>;

export function emailVerificationSubject(app: string, locale: Locale = defaultLocale) {
  return copy[locale].subject.replace('{app}', app);
}

interface EmailVerificationEmailProps {
  verifyLink: string;
  locale?: Locale;
}

export function EmailVerificationEmail({
  verifyLink,
  locale = defaultLocale,
}: EmailVerificationEmailProps) {
  const c = copy[locale];
  return (
    <Html>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>{c.heading}</Heading>
          <Text>{c.body}</Text>
          <Link href={verifyLink}>{c.cta}</Link>
        </Container>
      </Body>
    </Html>
  );
}
