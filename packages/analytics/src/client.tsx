'use client';
// @koeti/analytics — client.

import posthog from 'posthog-js';
import { track as vercelTrack } from '@vercel/analytics';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import { provider } from './provider';

let initialized = false;

function init() {
  if (initialized || typeof window === 'undefined') return;
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
    capture_pageview: false,
  });
  initialized = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (provider === 'vercel') {
    // ponytail: Vercel only accepts primitive prop values; anything else is dropped by their SDK
    vercelTrack(event, props as Parameters<typeof vercelTrack>[1]);
    return;
  }
  if (provider !== 'posthog') return;
  init();
  posthog.capture(event, props);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (provider !== 'posthog') return; // Vercel Analytics has no identify
  init();
  posthog.identify(userId, traits);
}

// Drop into the root layout once. Injects Vercel's pageview script when that
// provider is active; renders nothing otherwise.
export function Analytics() {
  return provider === 'vercel' ? <VercelAnalytics /> : null;
}
