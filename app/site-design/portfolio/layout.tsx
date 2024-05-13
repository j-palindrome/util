'use client'
import Section from '@/components/Section'
import _ from 'lodash'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'

export default function Portfolio({ children }: React.PropsWithChildren) {
  const page = useSelectedLayoutSegment()
  return (
    <>
      <Section>
        <div className='w-full flex justify-around *:font-heading h-topbar py-2'>
          {['home', 'about', 'work', 'services'].map(thisPage => (
            <Link
              href={`/site-design/portfolio/${thisPage}`}
              key={thisPage}
              className={`button ${page === thisPage ? 'bg-accent' : ''}`}>
              {thisPage}
            </Link>
          ))}
        </div>
      </Section>
      {children}
    </>
  )
}
