'use client'

import ShareIconButton from '@/components/ShareIconButton'

interface Props {
  url: string
  title: string
}

export default function BlogShareButton({ url, title }: Props) {
  return <ShareIconButton url={url} title={title} variant="ghost" size={20} />
}
