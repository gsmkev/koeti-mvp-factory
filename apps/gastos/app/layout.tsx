import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Lexend, Source_Sans_3 } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Analytics } from '@koeti/analytics/client';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { APP_NAME, APP_TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL ?? 'http://localhost:3000'),
  title: {
    default: `${APP_NAME} — control de gastos para equipos`,
    template: `%s | ${APP_NAME}`
  },
  description: APP_TAGLINE
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
    <html lang="es" className={`${lexend.variable} ${sourceSans.variable}`}>
      <body className="min-h-[100dvh]">
        <NuqsAdapter>
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
        </NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
}
