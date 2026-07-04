import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'
import { defaultLocale, type Locale } from '@koeti/i18n/config'

const copy = {
  en: {
    preview: 'You have been invited to join {team}',
    heading: 'Join {team}',
    body: '{inviter} invited you to join the team {team}. Create your account with this email address to accept the invitation.',
    cta: 'Accept invitation',
    subject: "You've been invited to {team}",
  },
  es: {
    preview: 'Te invitaron a unirte a {team}',
    heading: 'Unite a {team}',
    body: '{inviter} te invitó a unirte al equipo {team}. Creá tu cuenta con esta dirección de email para aceptar la invitación.',
    cta: 'Aceptar invitación',
    subject: 'Te invitaron a {team}',
  },
  pt: {
    preview: 'Você foi convidado para o {team}',
    heading: 'Entre no {team}',
    body: '{inviter} convidou você para o time {team}. Crie sua conta com este e-mail para aceitar o convite.',
    cta: 'Aceitar convite',
    subject: 'Você foi convidado para o {team}',
  },
} as const satisfies Record<Locale, Record<string, string>>

export function invitationSubject(teamName: string, locale: Locale = defaultLocale) {
  return copy[locale].subject.replace('{team}', teamName)
}

interface InvitationEmailProps {
  teamName: string
  inviterEmail: string
  inviteLink: string
  locale?: Locale
}

export function InvitationEmail({
  teamName,
  inviterEmail,
  inviteLink,
  locale = defaultLocale,
}: InvitationEmailProps) {
  const c = copy[locale]
  const fill = (s: string) => s.replace('{team}', teamName).replace('{inviter}', inviterEmail)
  return (
    <Html>
      <Head />
      <Preview>{fill(c.preview)}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>{fill(c.heading)}</Heading>
          <Text>{fill(c.body)}</Text>
          <Link href={inviteLink}>{c.cta}</Link>
        </Container>
      </Body>
    </Html>
  )
}
