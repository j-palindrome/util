import { PortableText } from '@portabletext/react'
import groq from 'groq'
import invariant from 'tiny-invariant'
import { useEffect, useState } from 'react'
import Section from '@/components/Section'
import ViewButton from '@/components/ViewButton'
import { sanityFetch } from '@/sanity/lib/fetch'
import { BioQueryResult } from '@/sanity.types'
import { BASE_URL } from '@/constants'
import SanityImageWrapper from '@/components/SanityImageWrapper'

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
        <SanityImageWrapper
          // Pass the Sanity Image ID (`_id`) (e.g., `image-abcde12345-1200x800-jpg`)
          id={bio.headshot!.asset!._ref}
          className='w-full h-full rounded-lg'
        />
      </div>

      <PortableText value={bio.bio!} />
      {bio.cv && <ViewButton href={bio.bioURL!}>CV</ViewButton>}
    </Section>
  )
}
