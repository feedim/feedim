import { Metadata } from 'next'
import PublicHeader from '@/components/PublicHeader'
import PublicFooter from '@/components/PublicFooter'
import CTASection from '@/components/CTASection'
import BlogPostCard from '@/components/blog/BlogPostCard'
import BlogJsonLd from '@/components/blog/BlogJsonLd'
import BlogPagination from '@/components/blog/BlogPagination'
import { getAllPosts } from '@/lib/blog/posts'
import { BLOG_BASE_URL, BLOG_SEO, POSTS_PER_PAGE } from '@/lib/blog/constants'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1)
  const allPosts = getAllPosts()
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE)
  const safePage = Math.min(currentPage, Math.max(totalPages, 1))

  const canonical = safePage === 1 ? `${BLOG_BASE_URL}/blog` : `${BLOG_BASE_URL}/blog?page=${safePage}`
  const title = safePage === 1 ? 'Blog | Forilove' : `Blog - Sayfa ${safePage} | Forilove`

  return {
    title,
    description:
      'Sevgiliye hediye fikirleri, dijital anı sayfaları ve romantik sürprizler hakkında blog yazıları. Forilove ile sevdiklerinize unutulmaz anılar yaratın.',
    keywords: [
      'sevgiliye hediye fikirleri',
      'dijital hediye',
      'online anı sayfası',
      'sevgililer günü',
      'romantik sürpriz',
      'kişiselleştirilmiş hediye',
      'sevgiliye online hediye',
    ],
    authors: [{ name: 'Forilove', url: BLOG_BASE_URL }],
    alternates: {
      canonical,
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
    openGraph: {
      title,
      description:
        'Sevgiliye hediye fikirleri, dijital anı sayfaları ve romantik sürprizler hakkında blog yazıları.',
      url: canonical,
      type: 'website',
      siteName: BLOG_SEO.siteName,
      locale: BLOG_SEO.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description:
        'Sevgiliye hediye fikirleri, dijital anı sayfaları ve romantik sürprizler hakkında blog yazıları.',
    },
  }
}

export default async function BlogPage({ searchParams }: Props) {
  const { page } = await searchParams
  const allPosts = getAllPosts()
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE)
  const currentPage = Math.min(Math.max(1, parseInt(page || '1', 10) || 1), Math.max(totalPages, 1))

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE
  const paginatedPosts = allPosts.slice(startIndex, startIndex + POSTS_PER_PAGE)

  return (
    <div className="min-h-screen bg-black text-white">
      <BlogJsonLd type="list" posts={allPosts} />
      <PublicHeader />

      <main className="container mx-auto px-3 sm:px-6 py-10 sm:py-16 max-w-4xl">
        <h1 className="text-5xl font-bold mb-4">Blog</h1>
        <p className="text-zinc-400 mb-12 text-lg">
          Sevgiliye hediye fikirleri, ilham veren öneriler ve daha fazlası.
        </p>

        <div className="border-t border-white/10">
          {paginatedPosts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>

        <BlogPagination currentPage={currentPage} totalPages={totalPages} />
      </main>

      <CTASection />
      <PublicFooter />
    </div>
  )
}
