// Next.js config: next-intl plugin, PPR, dev origins.
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Applied to every response. These are the headers that can't break resource
// loading, so they're safe as a factory default.
// ponytail: the CSP here is framing/base/object only — a content-restricting
// script-src/connect-src needs per-app nonces + the full external-origin list
// (Stripe, PostHog, Google). Add that in proxy.ts when an app locks down its CSP.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Ignored by browsers over http, so harmless in local dev; enforced once on https.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  // Dev-only: let the remote dev box's hostname fetch /_next/* assets (SSH /
  // host-forwarded dev). Ignored in prod. Override: DEV_ORIGINS=host1,host2
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? 'koeti-lab').split(','),
  experimental: {
    ppr: true,
    clientSegmentCache: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
