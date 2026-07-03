import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'

interface InvitationEmailProps {
  teamName: string
  inviterEmail: string
  inviteLink: string
}

export function InvitationEmail({ teamName, inviterEmail, inviteLink }: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join {teamName}</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>Join {teamName}</Heading>
          <Text>
            {inviterEmail} invited you to join the team {teamName}. Create your account with this
            email address to accept the invitation.
          </Text>
          <Link href={inviteLink}>Accept invitation</Link>
        </Container>
      </Body>
    </Html>
  )
}
