import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CTASection from '@/components/CTASection'
import PostMeta from '@/components/blog/PostMeta'
import BlogJsonLd from '@/components/blog/BlogJsonLd'
import { getAllPosts, getPostBySlug } from '@/lib/blog/posts'
import { BLOG_BASE_URL, BLOG_SEO } from '@/lib/blog/constants'
import BlogShareButton from './BlogShareButton'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}

  const url = `${BLOG_BASE_URL}/blog/${post.slug}`

  return {
    title: `${post.title} | Forilove Blog`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: 'Forilove', url: BLOG_BASE_URL }],
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.date,
      authors: [BLOG_BASE_URL],
      siteName: BLOG_SEO.siteName,
      locale: BLOG_SEO.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const otherPosts = getAllPosts().filter((p) => p.slug !== slug).slice(0, 3)
  const postUrl = `${BLOG_BASE_URL}/blog/${post.slug}`

  return (
    <div className="min-h-screen bg-black text-white">
      <BlogJsonLd type="post" post={post} />
      <PublicHeader backLabel="Blog" />

      <main className="container mx-auto px-3 sm:px-6 py-10 sm:py-16 max-w-3xl">
        <header className="mb-10">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
            <BlogShareButton url={postUrl} title={post.title} />
          </div>
          <div className="mt-4"></div>
          <PostMeta date={post.date} readTime={post.readTime} />
        </header>

        <article
          className="prose-blog"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {otherPosts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Diğer Yazılar</h2>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {otherPosts.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`}>
                  <div className="py-4 group">
                    <h3 className="font-semibold group-hover:text-pink-500 transition">
                      {p.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{p.readTime} okuma</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <CTASection />
      <PublicFooter />
    </div>
  )
}
