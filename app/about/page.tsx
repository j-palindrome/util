import { PortableText } from '@portabletext/react'
import groq from 'groq'
import invariant from 'tiny-invariant'
import { SanityImage } from 'sanity-image'
import { useEffect, useState } from 'react'
import Section from '@/components/Section'
import ViewButton from '@/components/ViewButton'
import { sanityFetch } from '@/sanity/lib/fetch'
import { BioQueryResult } from '@/sanity.types'
import { BASE_URL } from '@/constants'

const bioQuery = groq`*[_type == 'bio'][0] {
  ..., 
  'bioURL': cv.asset->url
}`

export default async function Bio() {
  const bio = await sanityFetch<BioQueryResult>({ query: bioQuery })
  invariant(bio)

  return (
    <Section>
      <div className='w-[50%] max-w-[300px] float-left mr-4 mb-4'>
        <SanityImage
          // Pass the Sanity Image ID (`_id`) (e.g., `image-abcde12345-1200x800-jpg`)
          id={bio.headshot!.asset!._ref}
          baseUrl={BASE_URL}
        />
      </div>

      <PortableText value={bio.bio!} />
      {bio.cv && <ViewButton href={bio.bioURL!}>CV</ViewButton>}
    </Section>
  )
}
