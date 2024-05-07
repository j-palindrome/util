import groq from 'groq'
import { cloneElement, useRef } from 'react'
import invariant from 'tiny-invariant'
import Section from '@/components/Section'
import WorksDisplay from './component'
import { PortableText } from '@portabletext/react'
import { sanityFetch } from '@/sanity/lib/fetch'
import { RoleQueryResult, WorksQueryResult } from '@/sanity.types'

const WorksQuery = groq`*[_type == 'work' && type->slug.current == $role]{..., 'videoBannerURL': videoBanner.asset->url, 'imageBannerURL': imageBanner.asset->url}`
const RoleQuery = groq`*[_type == 'category' && slug.current == $role][0]`

export default async function Role({
  children,
  params
}: React.PropsWithChildren & { params: { role: string } }) {
  const work = await sanityFetch<WorksQueryResult>({
    query: WorksQuery,
    params
  })
  const roleData = await sanityFetch<RoleQueryResult>({
    query: RoleQuery,
    params
  })
  invariant(work && roleData)

  return (
    <>
      <Section>
        <div className='*:font-heading text-center'>
          <PortableText value={roleData.description!} />
        </div>
      </Section>
      <WorksDisplay works={work} role={params.role} />
      {children}
    </>
  )
}
