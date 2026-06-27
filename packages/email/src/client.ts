import { Resend } from 'resend'
import type { ReactElement } from 'react'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  template,
  from = 'noreply@koeti.io',
}: {
  to: string
  subject: string
  template: ReactElement
  from?: string
}) {
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react: template,
  })
  if (error) throw new Error(`Failed to send email: ${error.message}`)
}
