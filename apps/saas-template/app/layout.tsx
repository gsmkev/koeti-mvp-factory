import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Lexend, Source_Sans_3 } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Analytics } from '@koeti/analytics/client';

export const metadata: Metadata = {
  title: 'ACME — SaaS Starter',
  description: 'Auth, billing, and team accounts wired in before your first feature.'
};

export const viewport: Viewport = {
  maximumScale: 1
};

const lexend = Lexend({ subsets: ['latin'], variable: '--font-heading' });
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-body' });

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className="min-h-[100dvh]">
        <SWRConfig
          value={{
            fallback: {
              // We do NOT await here
              // Only components that read this data will suspend
              '/api/user': getUser(),
              '/api/team': getTeamForUser()
            }
          }}
        >
          {children}
        </SWRConfig>
        <Analytics />
      </body>
    </html>
  );
}
