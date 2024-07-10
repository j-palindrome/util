import { ServiceQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import groq from 'groq'
import invariant from 'tiny-invariant'
import Client from './client'
import { ServiceQuery } from '@/sanity/queries'

export default async function Service({ children }: React.PropsWithChildren) {
  const data = await sanityFetch<ServiceQueryResult>({
    query: ServiceQuery,
    params: { service: 'design' }
  })
  invariant(data)
  return (
    <>
      <Client title={data['title']!} />
      {children}
    </>
  )
}
