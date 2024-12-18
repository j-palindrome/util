'use client'

import Section from '@/components/Section'
import { useState } from 'react'

export default function Sources() {
  const [source, chooseSource] = useState(0)
  const sources = [
    { title: 'The New River', link: 'https://thenewriver.us' },
    {
      title: 'the digital review',
      link: 'https://thedigitalreview.com/index.html'
    },
    { title: 'Taper', link: 'https://taper.badquar.to' },
    { title: 'the html review', link: 'https://thehtml.review/03/' },
    {
      title: 'the Electronic Book Review',
      link: 'https://electronicbookreview.com'
    },
    { title: 'Permeable Barrier', link: 'https://www.permeablebarrier.com/' },
    {
      title: 'Electronic Literature Organization',
      link: 'https://eliterature.org'
    },
    { title: 'poetrybeyondtext', link: 'https://www.poetrybeyondtext.org' },
    { title: 'rhizome.org', link: 'https://rhizome.org' }
  ]
  return (
    <Section fullWidth>
      <div className='flex flex-wrap justify-center'>
        {sources.map(({ title, link }) => (
          <a
            className='px-2 py-1 bg-accent rounded-lg m-1'
            href={link}
            target='sources'>
            {title}
          </a>
        ))}
      </div>

      <iframe name='sources' className='w-full h-[80vh]'></iframe>
    </Section>
  )
}
