// @koeti/email — client.
import { Resend } from 'resend';
import type { ReactElement } from 'react';

export async function sendEmail({
  to,
  subject,
  react,
  from = process.env.EMAIL_FROM ?? 'staff@koeti.com.py',
}: {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
}) {
  // No key (fresh scaffold, CI) → skip instead of 500ing the calling flow
  // (e.g. sign-up sending a welcome email). The warning is the signal.
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[koeti/email] RESEND_API_KEY not set — skipping email "${subject}" to ${to}`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    react,
  });
  if (error) throw new Error(`Failed to send email: ${error.message}`);
}
