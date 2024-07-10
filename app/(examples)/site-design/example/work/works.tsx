import { BannersQueryResult } from '@/sanity.types'
import { sanityFetch } from '@/sanity/lib/fetch'
import { bannersQuery } from '@/sanity/queries'
import invariant from 'tiny-invariant'
import Video from './Video'

export default async function Works() {
  const data = await sanityFetch<BannersQueryResult>({ query: bannersQuery })
  invariant(data)

  return (
    <>
      <div className='text-center'>
        <button>
          <a className='button' href='mailto:jtreinier@gmail.com'>
            Request a custom banner
          </a>
        </button>
      </div>
      <div className='sm:grid sm:grid-cols-4 w-full grid-flow-row justify-center'>
        {data.map(({ source: asset }, i) => (
          <Video key={i} asset={asset} />
        ))}
      </div>
    </>
  )
}
