import Section from '@/components/Section'
import { RoleQueryResult, WorksQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import { PortableText } from '@portabletext/react'
import groq from 'groq'
import invariant from 'tiny-invariant'
import WorksDisplay from './component'
import { WorksQuery, RoleQuery } from '@/sanity/queries'

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
