import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://feedim.com'
  const now = new Date().toISOString()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/premium`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/help`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/kvkk`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/disclaimer`, lastModified: now, changeFrequency: 'monthly', priority: 0.2 },
  ]

  const supabase = await createClient()

  // Dynamic post pages
  let postPages: MetadataRoute.Sitemap = []
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (posts) {
      postPages = posts.map(post => ({
        url: `${baseUrl}/post/${encodeURIComponent(post.slug)}`,
        lastModified: post.updated_at || post.published_at || now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
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
      }))
    }
  } catch {}

  return [...staticPages, ...postPages, ...profilePages]
}
