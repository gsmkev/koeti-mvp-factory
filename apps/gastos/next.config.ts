import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dev-only: let the remote dev box's hostname fetch /_next/* assets (SSH /
  // host-forwarded dev). Ignored in prod. Override: DEV_ORIGINS=host1,host2
  allowedDevOrigins: (process.env.DEV_ORIGINS ?? 'koeti-lab').split(','),
  experimental: {
    ppr: true,
    clientSegmentCache: true
  }
};

export default nextConfig;
