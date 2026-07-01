import { PostHog } from 'posthog-node'

// Lazy + optional: PostHog's constructor throws on a missing key, which would
// crash any app importing this package in an env without analytics configured
// (fresh scaffolds, CI). No key → analytics is a silent no-op.
let _client: PostHog | null | undefined
function client() {
  if (_client === undefined) {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    _client = apiKey
      ? new PostHog(apiKey, {
          host:
            process.env.POSTHOG_HOST ??
            process.env.NEXT_PUBLIC_POSTHOG_HOST ??
            'https://app.posthog.com',
          flushAt: 1,
          flushInterval: 0,
        })
      : null
  }
  return _client
}

export function track(event: string, props?: Record<string, unknown> & { userId?: string }) {
  const { userId, ...rest } = props ?? {}
  client()?.capture({ distinctId: userId ?? 'anonymous', event, properties: rest })
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  client()?.identify({ distinctId: userId, properties: traits })
}
