export type AnalyticsProvider = 'posthog' | 'vercel' | 'none'

// One env var picks the backend per app; unset falls back to PostHog when a
// key is present (previous behavior) and a silent no-op otherwise.
export const provider: AnalyticsProvider =
  (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER as AnalyticsProvider) ??
  (process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'posthog' : 'none')
