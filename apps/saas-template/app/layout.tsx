import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Lexend, Source_Sans_3 } from 'next/font/google';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { Analytics } from '@koeti/analytics/client';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { ThemeScript } from '@koeti/ui';
import { APP_NAME, APP_TAGLINE } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL ?? 'http://localhost:3000'),
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_TAGLINE
};

export const viewport: Viewport = {
  maximumScale: 1
};

const lexend = Lexend({ subsets: ['latin'], variable: '--font-heading' });
const sourceSans = Source_Sans_3({ subsets: ['latin'], variable: '--font-body' });

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${lexend.variable} ${sourceSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-[100dvh]">
        {/* NextIntlClientProvider inherits locale + messages from the request
            config (i18n/request.ts) — no need to pass them explicitly. */}
        <NextIntlClientProvider>
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
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
