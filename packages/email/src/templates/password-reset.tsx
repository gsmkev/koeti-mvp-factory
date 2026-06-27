import { Body, Container, Head, Heading, Html, Link, Preview, Text } from '@react-email/components'

interface PasswordResetEmailProps {
  resetUrl: string
}

export function PasswordResetEmail({ resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>Reset your password</Heading>
          <Text>Click the link below to reset your password. This link expires in 1 hour.</Text>
          <Link href={resetUrl}>Reset password</Link>
        </Container>
      </Body>
    </Html>
  )
}
