'use client'

import { BASE_URL_IMAGES } from '@/sanity/env'
import { SanityImage } from 'sanity-image'

export default function SanityImageWrapper({
  id,
  className
}: {
  id: string
  className?: string
}) {
  return <SanityImage id={id} className={className} baseUrl={BASE_URL_IMAGES} />
}
