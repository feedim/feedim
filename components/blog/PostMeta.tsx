import { Calendar, Clock } from 'lucide-react'

interface PostMetaProps {
  date: string
  readTime: string
  size?: 'sm' | 'base'
}

export default function PostMeta({ date, readTime, size = 'base' }: PostMetaProps) {
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className={`flex items-center gap-4 ${textClass} text-zinc-500`}>
      <span className="flex items-center gap-1.5">
        <Calendar className={iconClass} />
        {new Date(date).toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </span>
      <span className="flex items-center gap-1.5">
        <Clock className={iconClass} />
        {readTime} okuma
      </span>
    </div>
  )
}
