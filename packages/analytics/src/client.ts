'use client'

import posthog from 'posthog-js'

let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
  })
  initialized = true
}

export function track(event: string, props?: Record<string, unknown>) {
  init()
  posthog.capture(event, props)
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  init()
  posthog.identify(userId, traits)
}
