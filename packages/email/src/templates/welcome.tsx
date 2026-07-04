import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { defaultLocale, type Locale } from '@koeti/i18n/config'

// react-email renders outside the request, so there's no next-intl context —
// email copy lives here as a small per-locale dict instead. Keep it in sync
// across all three locales.
const copy = {
  en: {
    preview: 'Welcome to the platform',
    heading: 'Welcome, {name}!',
    body: 'Your account has been created. You can now sign in and get started.',
    subject: 'Welcome!',
  },
  es: {
    preview: 'Te damos la bienvenida',
    heading: '¡Bienvenido, {name}!',
    body: 'Tu cuenta ya está creada. Ya podés iniciar sesión y empezar.',
    subject: '¡Bienvenido!',
  },
  pt: {
    preview: 'Boas-vindas à plataforma',
    heading: 'Bem-vindo, {name}!',
    body: 'Sua conta foi criada. Você já pode entrar e começar.',
    subject: 'Boas-vindas!',
  },
} as const satisfies Record<Locale, Record<string, string>>

export function welcomeSubject(locale: Locale = defaultLocale) {
  return copy[locale].subject
}

interface WelcomeEmailProps {
  name: string
  locale?: Locale
}

export function WelcomeEmail({ name, locale = defaultLocale }: WelcomeEmailProps) {
  const c = copy[locale]
  return (
    <Html>
      <Head />
      <Preview>{c.preview}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>{c.heading.replace('{name}', name)}</Heading>
          <Text>{c.body}</Text>
        </Container>
      </Body>
    </Html>
  )
}
