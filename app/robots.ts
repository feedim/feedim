import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://feedim.com'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/onboarding',
          '/dashboard',
          '/settings',
          '/admin',
          '/create',
          '/moderation',
          '/notifications',
          '/bookmarks',
          '/transactions',
          '/coins',
          '/security',
          '/suggestions',
          '/analytics',
          '/profile',
          '/app-payment',
          '/subscription-payment',
          '/boost-payment',
          '/withdrawal',
          '/account-moderation',
          '/leaving',
          '/payment/',
          '/report/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
