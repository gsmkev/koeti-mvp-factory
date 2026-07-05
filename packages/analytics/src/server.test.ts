// Tests for server.
import { describe, expect, it, vi } from 'vitest';

vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');

import { identify, track } from './server';

describe('analytics without a PostHog key', () => {
  it('track is a silent no-op', () => {
    expect(() => track('signed_up', { userId: '1', plan: 'base' })).not.toThrow();
  });

  it('identify is a silent no-op', () => {
    expect(() => identify('1', { email: 'a@b.c' })).not.toThrow();
  });
});

describe('provider selection', () => {
  it('vercel provider routes track to @vercel/analytics/server', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_ANALYTICS_PROVIDER', 'vercel');
    const spy = vi.fn().mockResolvedValue(undefined);
    vi.doMock('@vercel/analytics/server', () => ({ track: spy }));

    const server = await import('./server');
    server.track('signed_up', { userId: '1', plan: 'base' });
    expect(spy).toHaveBeenCalledWith('signed_up', { userId: '1', plan: 'base' });

    expect(() => server.identify('1', { email: 'a@b.c' })).not.toThrow();
    expect(spy).toHaveBeenCalledTimes(1); // identify never reaches Vercel

    vi.doUnmock('@vercel/analytics/server');
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
  });
});
