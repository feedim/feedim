import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { locales, defaultLocale } from '@/i18n/config'
import { getShareablePostUrl } from '@/lib/utils'
import { encodeId } from '@/lib/hashId'

function buildAlternates(baseUrl: string, path: string) {
  const languages: Record<string, string> = {}
  for (const locale of locales) {
    languages[locale] = locale === defaultLocale
      ? `${baseUrl}${path}`
      : `${baseUrl}/${locale}${path}`
  }
  languages['x-default'] = `${baseUrl}${path}`
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

  const admin = createAdminClient()

  // Dynamic post pages — only public posts from non-private active accounts
  let postPages: MetadataRoute.Sitemap = []
  try {
    const { data: posts } = await admin
      .from('posts')
      .select('slug, content_type, updated_at, published_at, visibility, author_id, profiles!inner(account_private, status)')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .eq('is_nsfw', false)
      .eq('profiles.account_private', false)
      .eq('profiles.status', 'active')
      .order('published_at', { ascending: false })

    if (posts) {
      postPages = posts.map(post => {
        const path = getShareablePostUrl(post.slug, post.content_type)
        return {
          url: `${baseUrl}${path}`,
          lastModified: post.updated_at || post.published_at || now,
          changeFrequency: 'weekly' as const,
          priority: post.content_type === 'video' ? 0.8 : 0.7,
          alternates: buildAlternates(baseUrl, path),
        }
      })
    }
  } catch {
    // Fail silently — static pages will still be included
  }

  // Dynamic user profile pages — only active non-private accounts
  let profilePages: MetadataRoute.Sitemap = []
  try {
    const { data: profiles } = await admin
      .from('profiles')
      .select('username, updated_at')
      .eq('status', 'active')
      .eq('account_private', false)
      .order('updated_at', { ascending: false })

    if (profiles) {
      profilePages = profiles.map(p => {
        const path = `/u/${encodeURIComponent(p.username)}`
        return {
          url: `${baseUrl}${path}`,
          lastModified: p.updated_at || now,
          changeFrequency: 'weekly' as const,
          priority: 0.6,
          alternates: buildAlternates(baseUrl, path),
        }
      })
    }
  } catch {}

  // Dynamic tag pages — tags with at least 1 post
  let tagPages: MetadataRoute.Sitemap = []
  try {
    const { data: tags } = await admin
      .from('tags')
      .select('slug, updated_at')
      .gt('post_count', 0)
      .order('post_count', { ascending: false })
      .limit(5000)

    if (tags) {
      tagPages = tags.map(tag => {
        const path = `/explore/tag/${encodeURIComponent(tag.slug)}`
        return {
          url: `${baseUrl}${path}`,
          lastModified: tag.updated_at || now,
          changeFrequency: 'daily' as const,
          priority: 0.5,
          alternates: buildAlternates(baseUrl, path),
        }
      })
    }
  } catch {}

  // Dynamic sound pages — active sounds with usage
  let soundPages: MetadataRoute.Sitemap = []
  try {
    const { data: sounds } = await admin
      .from('sounds')
      .select('id, updated_at')
      .eq('status', 'active')
      .gt('usage_count', 0)
      .order('usage_count', { ascending: false })
      .limit(5000)

    if (sounds) {
      soundPages = sounds.map(s => {
        const path = `/sounds/${encodeId(s.id)}`
        return {
          url: `${baseUrl}${path}`,
          lastModified: s.updated_at || now,
          changeFrequency: 'weekly' as const,
          priority: 0.4,
        }
      })
    }
  } catch {}

  return [...staticPages, ...postPages, ...profilePages, ...tagPages, ...soundPages]
}
