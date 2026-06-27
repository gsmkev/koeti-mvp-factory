import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'

interface WelcomeEmailProps {
  name: string | null
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to the platform</Preview>
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ padding: '40px', maxWidth: '560px', margin: '0 auto' }}>
          <Heading>Welcome{name ? `, ${name}` : ''}!</Heading>
          <Text>Your account has been created. You can now sign in and get started.</Text>
        </Container>
      </Body>
    </Html>
  )
}
