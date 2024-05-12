'use client'

import Section from '@/components/Section'
import { useState } from 'react'
import _ from 'lodash'
import { generateRandomString } from '@/util/src/text'
import About from './About'
import Work from './Work'
import Services from './Services'
import Home from './Home'

export default function Portfolio() {
  const pages = ['home', 'about', 'work', 'services']
  const [page, setPage] = useState<(typeof pages)[number]>('home')
  return (
    <>
      <Section>
        <div className='w-full flex justify-around *:font-heading h-topbar py-2'>
          {pages.map(thisPage => (
            <button
              key={thisPage}
              className={`button ${page === thisPage ? 'bg-accent' : ''}`}
              onClick={() => setPage(thisPage)}>
              {thisPage}
            </button>
          ))}
        </div>
      </Section>
      {page === 'home' ? (
        <Home />
      ) : page === 'about' ? (
        <About />
      ) : page === 'work' ? (
        <Work />
      ) : page === 'services' ? (
        <Services />
      ) : (
        <></>
      )}
    </>
  )
}
