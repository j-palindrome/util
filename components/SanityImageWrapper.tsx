'use client'

import { BASE_URL } from '@/constants'
import { SanityImage } from 'sanity-image'

export default function SanityImageWrapper({
  id,
  className
}: {
  id: string
  className?: string
}) {
  return <SanityImage id={id} className={className} baseUrl={BASE_URL} />
}
