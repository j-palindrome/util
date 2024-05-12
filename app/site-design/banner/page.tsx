import { BannersQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import groq from 'groq'
import _ from 'lodash'
import invariant from 'tiny-invariant'
import Video from './Video'

const bannersQuery = groq`*[_type == 'demo' && slug.current == 'banners'][0].files[]{'source': uploadSource.asset->{url, mimeType, _id}}`
export default async function Banner() {
  const data = await sanityFetch<BannersQueryResult>({ query: bannersQuery })
  invariant(data)
  console.log(data)

  return (
    <>
      <div className='text-center'>
        <a className='button' href='mailto:jtreinier@gmail.com'>
          Request a custom banner
        </a>
      </div>
      <div className='sm:grid sm:grid-cols-4 w-full grid-flow-row'>
        {data.map(({ source: asset }) => (
          <Video asset={asset} />
        ))}
      </div>
    </>
  )
}
