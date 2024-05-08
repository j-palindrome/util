import { BannersQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import groq from 'groq'
import _ from 'lodash'
import invariant from 'tiny-invariant'

const bannersQuery = groq`*[_type == 'demo' && slug.current == 'banners'][0].files[]{'source': uploadSource.asset->{url, mimeType}}`
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
          <div className='w-full aspect-square p-4'>
            {asset.mimeType?.startsWith('video') ? (
              <video
                className='w-full h-full'
                muted
                autoPlay
                loop
                src={asset.url}
              />
            ) : (
              <img className='w-full h-full' src={asset.url} />
            )}
          </div>
        ))}
      </div>
    </>
  )
}
