export const BLOG_BASE_URL = 'https://forilove.com'

export const BLOG_PUBLISHER = {
  '@type': 'Organization' as const,
  name: 'Forilove',
  url: BLOG_BASE_URL,
  '@id': `${BLOG_BASE_URL}/#organization`,
}

export const BLOG_SEO = {
  siteName: 'Forilove',
  locale: 'tr_TR',
  language: 'tr-TR',
}

export const POSTS_PER_PAGE = 10
