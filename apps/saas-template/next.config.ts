// Next.js config: next-intl plugin, PPR, dev origins.
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Dev-only: let the remote dev box's hostname fetch /_next/* assets (SSH /
  // host-forwarded dev). Ignored in prod. Override: DEV_ORIGINS=host1,host2
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? 'koeti-lab').split(','),
  experimental: {
    ppr: true,
    clientSegmentCache: true,
  },
};

export default withNextIntl(nextConfig);
