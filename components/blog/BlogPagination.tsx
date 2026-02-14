import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface BlogPaginationProps {
  currentPage: number
  totalPages: number
}

export default function BlogPagination({ currentPage, totalPages }: BlogPaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav className="flex items-center justify-center gap-2 pt-10" aria-label="Blog sayfalama">
      {/* Prev */}
      {currentPage > 1 ? (
        <Link
          href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}
          className="flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Önceki sayfa"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <span className="flex items-center justify-center w-10 h-10 rounded-full text-zinc-600 cursor-not-allowed">
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}

      {/* Page numbers */}
      {pages.map((page) => (
        <Link
          key={page}
          href={page === 1 ? '/blog' : `/blog?page=${page}`}
          className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition ${
            page === currentPage
              ? 'bg-pink-500 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
          }`}
          aria-label={`Sayfa ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Link>
      ))}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={`/blog?page=${currentPage + 1}`}
          className="flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          aria-label="Sonraki sayfa"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : (
        <span className="flex items-center justify-center w-10 h-10 rounded-full text-zinc-600 cursor-not-allowed">
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  )
}
