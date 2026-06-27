import { PostHog } from 'posthog-node'

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
  flushAt: 1,
  flushInterval: 0,
})

export function track(event: string, props?: Record<string, unknown> & { userId?: string }) {
  const { userId, ...rest } = props ?? {}
  client.capture({ distinctId: userId ?? 'anonymous', event, properties: rest })
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  client.identify({ distinctId: userId, properties: traits })
}
