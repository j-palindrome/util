import { ServiceQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import groq from 'groq'
import invariant from 'tiny-invariant'
import Client from './client'

const ServiceQuery = groq`*[_type == 'service' && slug.current == $service][0]{ 
  ..., 
  'scenes': scenes[]{
    title, subtitle,
    'highlightedWorks': highlightedWorks[]->
  }
}`

export default async function Service() {
  const data = await sanityFetch<ServiceQueryResult>({
    query: ServiceQuery,
    params: { service: 'design' }
  })
  invariant(data)
  return <Client title={data.title!} />
}
