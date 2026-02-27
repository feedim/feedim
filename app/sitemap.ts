import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { locales, defaultLocale } from '@/i18n/config'
import { getPostUrl } from '@/lib/utils'

function buildAlternates(baseUrl: string, path: string) {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[locale] = locale === defaultLocale
      ? `${baseUrl}${path}`
      : `${baseUrl}/${locale}${path}`
  }
  return { languages }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://feedim.com'
  const now = new Date().toISOString()

  // Static pages — public pages get locale alternates
  const publicStaticPaths = [
    { path: '/help', changeFrequency: 'monthly' as const, priority: 0.6 },
    { path: '/help/about', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/help/terms', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/privacy', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/disclaimer', changeFrequency: 'monthly' as const, priority: 0.2 },
    { path: '/help/contact', changeFrequency: 'monthly' as const, priority: 0.5 },
    { path: '/help/community-guidelines', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/copyright', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/coins', changeFrequency: 'monthly' as const, priority: 0.4 },
    { path: '/help/earning', changeFrequency: 'monthly' as const, priority: 0.4 },
    { path: '/help/analytics', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/moderation', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/ai', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/content-types', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/data-sharing', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/access-restrictions', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/accessibility', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/payment-security', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/refund-policy', changeFrequency: 'monthly' as const, priority: 0.3 },
    { path: '/help/distance-sales-contract', changeFrequency: 'monthly' as const, priority: 0.2 },
    { path: '/help/pre-information-form', changeFrequency: 'monthly' as const, priority: 0.2 },
  ]

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/premium`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/explore`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/moments`, changeFrequency: 'hourly' as const, priority: 0.8 },
    { url: `${baseUrl}/video`, changeFrequency: 'hourly' as const, priority: 0.8 },
    { url: `${baseUrl}/notes`, changeFrequency: 'hourly' as const, priority: 0.7 },
    { url: `${baseUrl}/posts`, changeFrequency: 'hourly' as const, priority: 0.7 },
    { url: `${baseUrl}/sounds`, changeFrequency: 'daily' as const, priority: 0.5 },
    // Public pages with locale alternates
    ...publicStaticPaths.map(({ path, changeFrequency, priority }) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: buildAlternates(baseUrl, path),
    })),
  ]

  const supabase = await createClient()

  // Dynamic post pages
  let postPages: MetadataRoute.Sitemap = []
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('slug, content_type, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (posts) {
      postPages = posts.map(post => {
        const path = getPostUrl(post.slug, post.content_type)
        return {
          url: `${baseUrl}${path}`,
          lastModified: post.updated_at || post.published_at || now,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          alternates: buildAlternates(baseUrl, path),
        }
      })
    }
  } catch {
    // Fail silently — static pages will still be included
  }

  // Dynamic user profile pages
  let profilePages: MetadataRoute.Sitemap = []
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .eq('status', 'active')
      .eq('account_private', false)
      .order('updated_at', { ascending: false })

    if (profiles) {
      profilePages = profiles.map(p => ({
        url: `${baseUrl}/u/${encodeURIComponent(p.username)}`,
        lastModified: p.updated_at || now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
        alternates: buildAlternates(baseUrl, `/u/${encodeURIComponent(p.username)}`),
      }))
    }
  } catch {}

  return [...staticPages, ...postPages, ...profilePages]
}
