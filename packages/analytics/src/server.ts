// @koeti/analytics — server.
import { PostHog } from 'posthog-node';
import { track as vercelTrack } from '@vercel/analytics/server';
import { provider } from './provider';

// Lazy + optional: PostHog's constructor throws on a missing key, which would
// crash any app importing this package in an env without analytics configured
// (fresh scaffolds, CI). No key → analytics is a silent no-op.
let _client: PostHog | null | undefined;
function client() {
  if (_client === undefined) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    _client = apiKey
      ? new PostHog(apiKey, {
          host:
            process.env.POSTHOG_HOST ??
            process.env.NEXT_PUBLIC_POSTHOG_HOST ??
            'https://app.posthog.com',
          flushAt: 1,
          flushInterval: 0,
        })
      : null;
  }
  return _client;
}

export function track(event: string, props?: Record<string, unknown> & { userId?: string }) {
  const { userId, ...rest } = props ?? {};
  if (provider === 'vercel') {
    // Fire-and-forget on Vercel, silent no-op elsewhere. userId folds into
    // props — Vercel Analytics has no identity model.
    void vercelTrack(event, {
      ...(userId ? { userId } : {}),
      ...rest,
    } as Parameters<typeof vercelTrack>[1]).catch(() => {});
    return;
  }
  if (provider !== 'posthog') return;
  client()?.capture({ distinctId: userId ?? 'anonymous', event, properties: rest });
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (provider !== 'posthog') return; // Vercel Analytics has no identify
  client()?.identify({ distinctId: userId, properties: traits });
}
