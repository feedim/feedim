import type { BlogPost } from '@/lib/blog/posts'
import { getWordCount } from '@/lib/blog/posts'
import { BLOG_BASE_URL, BLOG_PUBLISHER, BLOG_SEO } from '@/lib/blog/constants'

interface BlogListJsonLdProps {
  type: 'list'
  posts: BlogPost[]
}

interface BlogPostJsonLdProps {
  type: 'post'
  post: BlogPost
}

type BlogJsonLdProps = BlogListJsonLdProps | BlogPostJsonLdProps

export default function BlogJsonLd(props: BlogJsonLdProps) {
  const schemas = props.type === 'list' ? buildListSchemas(props.posts) : buildPostSchemas(props.post)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
    />
  )
}

function buildListSchemas(posts: BlogPost[]) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      '@id': `${BLOG_BASE_URL}/blog`,
      name: 'Forilove Blog',
      description:
        'Sevgiliye hediye fikirleri, dijital aşk sayfaları ve romantik sürprizler hakkında blog yazıları.',
      url: `${BLOG_BASE_URL}/blog`,
      inLanguage: BLOG_SEO.language,
      publisher: BLOG_PUBLISHER,
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        url: `${BLOG_BASE_URL}/blog/${post.slug}`,
      })),
    },
    buildBreadcrumb([{ name: 'Blog', url: `${BLOG_BASE_URL}/blog` }]),
  ]
}

function buildPostSchemas(post: BlogPost) {
  const postUrl = `${BLOG_BASE_URL}/blog/${post.slug}`

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      wordCount: getWordCount(post.content),
      inLanguage: BLOG_SEO.language,
      author: BLOG_PUBLISHER,
      publisher: BLOG_PUBLISHER,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': postUrl,
      },
      keywords: post.keywords.join(', '),
      isPartOf: {
        '@type': 'Blog',
        '@id': `${BLOG_BASE_URL}/blog`,
        name: 'Forilove Blog',
      },
    },
    buildBreadcrumb([
      { name: 'Blog', url: `${BLOG_BASE_URL}/blog` },
      { name: post.title, url: postUrl },
    ]),
  ]
}

function buildBreadcrumb(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: BLOG_BASE_URL,
      },
      ...items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: item.name,
        item: item.url,
      })),
    ],
  }
}
