import type { MetadataRoute } from 'next'

// Public marketing surface only — the dashboard is auth-gated and noindexed
// via robots.ts. Add new public routes here as the app grows.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.BASE_URL ?? 'http://localhost:3000'
  return ['/', '/pricing', '/sign-in', '/sign-up'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }))
}
