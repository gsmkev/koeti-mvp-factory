import { Resend } from 'resend'
import type { ReactElement } from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  react,
  from = 'noreply@koeti.io',
}: {
  to: string
  subject: string
  react: ReactElement
  from?: string
}) {
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react,
  })
  if (error) throw new Error(`Failed to send email: ${error.message}`)
}
