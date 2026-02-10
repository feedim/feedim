import Link from 'next/link'
import type { BlogPost } from '@/lib/blog/posts'
import PostMeta from './PostMeta'

interface BlogPostCardProps {
  post: BlogPost
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="py-6 group border-b border-white/10">
        <h2 className="text-lg font-semibold mb-1 group-hover:text-pink-500 transition">
          {post.title}
        </h2>
        <p className="text-gray-400 text-sm mb-3 leading-relaxed">{post.description}</p>
        <PostMeta date={post.date} readTime={post.readTime} size="sm" />
      </article>
    </Link>
  )
}
